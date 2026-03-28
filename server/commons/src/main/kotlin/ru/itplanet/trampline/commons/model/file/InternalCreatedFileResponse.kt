package ru.itplanet.trampline.commons.model.file

data class InternalCreatedFileResponse(
    val fileId: Long,
    val storageProvider: FileStorageProvider,
    val originalFileName: String,
    val mediaType: String,
    val sizeBytes: Long,
    val status: FileAssetStatus,
    val kind: FileAssetKind,
    val visibility: FileAssetVisibility,
)
