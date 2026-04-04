package ru.itplanet.trampline.media.service

import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.dao.FileAssetDao
import ru.itplanet.trampline.commons.dao.dto.FileAssetDto
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileStorageProvider
import ru.itplanet.trampline.media.exception.MediaConflictException
import ru.itplanet.trampline.media.exception.MediaIntegrationException
import ru.itplanet.trampline.media.exception.MediaNotFoundException
import java.security.MessageDigest

@Service
class FileAssetService(
    private val fileAssetDao: FileAssetDao,
    private val objectStorage: ObjectStorage,
    private val fileKeyFactory: FileKeyFactory,
    private val fileValidationService: FileValidationService,
    private val transactionTemplate: TransactionTemplate,
) {

    @Transactional(readOnly = true)
    fun getMetadata(fileId: Long): FileAssetDto {
        return findExistingNotDeletedFile(fileId)
    }

    @Transactional(readOnly = true)
    fun getDownloadUrl(fileId: Long): ObjectStorage.PresignedUrl {
        val fileAsset = findExistingNotDeletedFile(fileId)

        if (fileAsset.status != FileAssetStatus.READY) {
            throw MediaConflictException(
                message = "Ссылку на скачивание можно сформировать только для файла в статусе READY",
                code = "file_download_not_ready",
                details = mapOf("status" to fileAsset.status.name),
            )
        }

        return try {
            objectStorage.generateDownloadUrl(fileAsset.storageKey)
        } catch (_: Exception) {
            throw MediaIntegrationException(
                message = "Не удалось сформировать ссылку для скачивания файла",
                code = "file_download_url_generation_failed",
            )
        }
    }

    fun upload(
        file: MultipartFile,
        ownerUserId: Long,
        kind: FileAssetKind,
        visibility: FileAssetVisibility = FileAssetVisibility.PRIVATE,
    ): FileAssetDto {
        fileValidationService.validate(file, kind)

        val originalFileName = file.originalFilename?.takeIf { it.isNotBlank() } ?: "file.bin"
        val mediaType = file.contentType?.takeIf { it.isNotBlank() } ?: MediaType.APPLICATION_OCTET_STREAM_VALUE
        val bytes = file.bytes
        val checksumSha256 = sha256Hex(bytes)
        val storageKey = fileKeyFactory.buildKey(
            kind = kind,
            ownerUserId = ownerUserId,
            originalFileName = originalFileName,
        )

        val createdFileAsset = transactionTemplate.execute {
            fileAssetDao.save(
                FileAssetDto().apply {
                    this.ownerUserId = ownerUserId
                    this.storageProvider = FileStorageProvider.S3
                    this.storageKey = storageKey
                    this.originalFileName = originalFileName
                    this.mediaType = mediaType
                    this.sizeBytes = bytes.size.toLong()
                    this.checksumSha256 = checksumSha256
                    this.kind = kind
                    this.visibility = visibility
                    this.status = FileAssetStatus.UPLOADING
                },
            )
        } ?: throw IllegalStateException("Не удалось создать запись о файле")

        return try {
            objectStorage.putObject(
                key = createdFileAsset.storageKey,
                bytes = bytes,
                contentType = createdFileAsset.mediaType,
                metadata = buildMetadata(createdFileAsset),
            )

            transactionTemplate.execute {
                val fileAsset = fileAssetDao.findById(createdFileAsset.id!!)
                    .orElse(null)
                    ?: throw MediaIntegrationException(
                        message = "Не удалось завершить загрузку файла: запись о файле не найдена",
                        code = "file_upload_finalize_failed",
                    )

                fileAsset.status = FileAssetStatus.READY
                fileAssetDao.save(fileAsset)
            } ?: throw MediaIntegrationException(
                message = "Не удалось обновить статус файла после загрузки",
                code = "file_upload_finalize_failed",
            )
        } catch (ex: MediaIntegrationException) {
            transactionTemplate.executeWithoutResult {
                val fileAsset = fileAssetDao.findById(createdFileAsset.id!!).orElse(null)
                if (fileAsset != null) {
                    fileAsset.status = FileAssetStatus.FAILED
                    fileAssetDao.save(fileAsset)
                }
            }
            throw ex
        } catch (_: Exception) {
            transactionTemplate.executeWithoutResult {
                val fileAsset = fileAssetDao.findById(createdFileAsset.id!!).orElse(null)
                if (fileAsset != null) {
                    fileAsset.status = FileAssetStatus.FAILED
                    fileAssetDao.save(fileAsset)
                }
            }

            throw MediaIntegrationException(
                message = "Не удалось загрузить файл в объектное хранилище",
                code = "object_storage_upload_failed",
            )
        }
    }

    private fun findExistingNotDeletedFile(fileId: Long): FileAssetDto {
        val fileAsset = fileAssetDao.findById(fileId)
            .orElseThrow {
                MediaNotFoundException(
                    message = "Файл не найден",
                    code = "file_not_found",
                )
            }

        if (fileAsset.status == FileAssetStatus.DELETED) {
            throw MediaNotFoundException(
                message = "Файл не найден",
                code = "file_not_found",
            )
        }

        return fileAsset
    }

    private fun buildMetadata(fileAsset: FileAssetDto): Map<String, String> = buildMap {
        fileAsset.id?.let { put("file-id", it.toString()) }
        fileAsset.ownerUserId?.let { put("owner-user-id", it.toString()) }
        put("kind", fileAsset.kind.name)
        put("visibility", fileAsset.visibility.name)
    }

    private fun sha256Hex(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.joinToString(separator = "") { byte ->
            "%02x".format(byte)
        }
    }
}
