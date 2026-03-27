package ru.itplanet.trampline.media.model.response

import ru.itplanet.trampline.commons.dao.dto.FileAssetDto
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileStorageProvider
import java.time.OffsetDateTime

data class FileMetadataResponse(
    val fileId: Long,
    val ownerUserId: Long?,
    val storageProvider: FileStorageProvider,
    val originalFileName: String,
    val mediaType: String,
    val sizeBytes: Long,
    val checksumSha256: String?,
    val status: FileAssetStatus,
    val kind: FileAssetKind,
    val visibility: FileAssetVisibility,
    val createdAt: OffsetDateTime?,
    val updatedAt: OffsetDateTime?,
) {
    companion object {
        fun from(fileAsset: FileAssetDto): FileMetadataResponse {
            return FileMetadataResponse(
                fileId = fileAsset.id!!,
                ownerUserId = fileAsset.ownerUserId,
                storageProvider = fileAsset.storageProvider,
                originalFileName = fileAsset.originalFileName,
                mediaType = fileAsset.mediaType,
                sizeBytes = fileAsset.sizeBytes,
                checksumSha256 = fileAsset.checksumSha256,
                status = fileAsset.status,
                kind = fileAsset.kind,
                visibility = fileAsset.visibility,
                createdAt = fileAsset.createdAt,
                updatedAt = fileAsset.updatedAt,
            )
        }
    }
}
