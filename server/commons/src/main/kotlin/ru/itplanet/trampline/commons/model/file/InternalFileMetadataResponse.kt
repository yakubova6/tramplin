package ru.itplanet.trampline.commons.model.file

import java.time.OffsetDateTime

data class InternalFileMetadataResponse(
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
)
