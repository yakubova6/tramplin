package ru.itplanet.trampline.media.service

import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
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
) {

    @Transactional
    fun upload(
        file: MultipartFile,
        kind: FileAssetKind,
        ownerUserId: Long? = null,
        visibility: FileAssetVisibility = FileAssetVisibility.PRIVATE,
    ): FileAssetDto {
        val originalFileName = file.originalFilename?.takeIf { it.isNotBlank() } ?: "file.bin"
        val mediaType = file.contentType?.takeIf { it.isNotBlank() } ?: MediaType.APPLICATION_OCTET_STREAM_VALUE
        val bytes = file.bytes
        val storageKey = fileKeyFactory.buildKey(
            kind = kind,
            ownerUserId = ownerUserId,
            originalFileName = originalFileName,
        )

        val fileAsset = FileAssetDto().apply {
            this.ownerUserId = ownerUserId
            this.storageProvider = FileStorageProvider.S3
            this.storageKey = storageKey
            this.originalFileName = originalFileName
            this.mediaType = mediaType
            this.sizeBytes = bytes.size.toLong()
            this.checksumSha256 = sha256Hex(bytes)
            this.kind = kind
            this.visibility = visibility
            this.status = FileAssetStatus.UPLOADING
        }

        val savedFileAsset = fileAssetDao.save(fileAsset)

        return try {
            objectStorage.putObject(
                key = savedFileAsset.storageKey,
                bytes = bytes,
                contentType = savedFileAsset.mediaType,
                metadata = buildMetadata(savedFileAsset),
            )

            savedFileAsset.status = FileAssetStatus.READY
            fileAssetDao.save(savedFileAsset)
        } catch (ex: Exception) {
            savedFileAsset.status = FileAssetStatus.FAILED
            fileAssetDao.save(savedFileAsset)
            throw IllegalStateException("Failed to upload file to object storage", ex)
        }
    }

    @Transactional(readOnly = true)
    fun getById(fileId: Long): FileAssetDto {
        return fileAssetDao.findById(fileId)
            .orElseThrow { NoSuchElementException("File asset $fileId not found") }
    }

    @Transactional(readOnly = true)
    fun generateDownloadUrl(fileId: Long): String {
        val fileAsset = getById(fileId)
        check(fileAsset.status == FileAssetStatus.READY) { "File asset $fileId is not ready" }
        return objectStorage.generatePresignedGetUrl(fileAsset.storageKey)
    }

    @Transactional(readOnly = true)
    fun generateUploadUrl(
        kind: FileAssetKind,
        ownerUserId: Long? = null,
        originalFileName: String,
    ): String {
        val storageKey = fileKeyFactory.buildKey(
            kind = kind,
            ownerUserId = ownerUserId,
            originalFileName = originalFileName,
        )

        return objectStorage.generatePresignedPutUrl(storageKey)
    }

    @Transactional
    fun delete(fileId: Long) {
        val fileAsset = getById(fileId)

        if (fileAsset.status == FileAssetStatus.DELETED) {
            return
        }

        objectStorage.deleteObject(fileAsset.storageKey)
        fileAsset.status = FileAssetStatus.DELETED
        fileAssetDao.save(fileAsset)
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
