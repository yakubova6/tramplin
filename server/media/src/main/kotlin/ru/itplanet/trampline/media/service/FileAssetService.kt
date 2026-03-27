package ru.itplanet.trampline.media.service

import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.dao.FileAssetDao
import ru.itplanet.trampline.commons.dao.dto.FileAssetDto
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileStorageProvider
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
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "File must be in READY status to generate download url. Current status: ${fileAsset.status.name}"
            )
        }

        return objectStorage.generateDownloadUrl(fileAsset.storageKey)
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
                }
            )
        } ?: throw IllegalStateException("Failed to create file asset record")

        return try {
            objectStorage.putObject(
                key = createdFileAsset.storageKey,
                bytes = bytes,
                contentType = createdFileAsset.mediaType,
                metadata = buildMetadata(createdFileAsset),
            )

            transactionTemplate.execute {
                val fileAsset = fileAssetDao.findById(createdFileAsset.id!!)
                    .orElseThrow { NoSuchElementException("File asset ${createdFileAsset.id} not found") }

                fileAsset.status = FileAssetStatus.READY
                fileAssetDao.save(fileAsset)
            } ?: throw IllegalStateException("Failed to update file asset status to READY")
        } catch (ex: Exception) {
            transactionTemplate.executeWithoutResult {
                val fileAsset = fileAssetDao.findById(createdFileAsset.id!!).orElse(null)
                if (fileAsset != null) {
                    fileAsset.status = FileAssetStatus.FAILED
                    fileAssetDao.save(fileAsset)
                }
            }

            throw IllegalStateException("Failed to upload file to object storage", ex)
        }
    }

    private fun findExistingNotDeletedFile(fileId: Long): FileAssetDto {
        val fileAsset = fileAssetDao.findById(fileId)
            .orElseThrow { fileNotFound() }

        if (fileAsset.status == FileAssetStatus.DELETED) {
            throw fileNotFound()
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

    private fun fileNotFound(): ResponseStatusException {
        return ResponseStatusException(HttpStatus.NOT_FOUND, "File not found")
    }
}
