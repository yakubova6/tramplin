package ru.itplanet.trampline.media.mapper

import ru.itplanet.trampline.commons.dao.dto.FileAssetDto
import ru.itplanet.trampline.commons.dao.dto.FileAttachmentDto
import ru.itplanet.trampline.commons.model.file.InternalCreatedFileResponse
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.file.InternalFileDownloadUrlResponse
import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse
import ru.itplanet.trampline.media.service.ObjectStorage

fun FileAssetDto.toInternalCreatedFileResponse(): InternalCreatedFileResponse {
    return InternalCreatedFileResponse(
        fileId = id!!,
        storageProvider = storageProvider,
        originalFileName = originalFileName,
        mediaType = mediaType,
        sizeBytes = sizeBytes,
        status = status,
        kind = kind,
        visibility = visibility,
    )
}

fun FileAssetDto.toInternalFileMetadataResponse(): InternalFileMetadataResponse {
    return InternalFileMetadataResponse(
        fileId = id!!,
        ownerUserId = ownerUserId,
        storageProvider = storageProvider,
        originalFileName = originalFileName,
        mediaType = mediaType,
        sizeBytes = sizeBytes,
        checksumSha256 = checksumSha256,
        status = status,
        kind = kind,
        visibility = visibility,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )
}

fun FileAttachmentDto.toInternalFileAttachmentResponse(): InternalFileAttachmentResponse {
    val loadedFile = file
        ?: throw IllegalStateException("File relation is not loaded for attachment $id")

    return InternalFileAttachmentResponse(
        attachmentId = id!!,
        fileId = fileId,
        entityType = entityType,
        entityId = entityId,
        attachmentRole = attachmentRole,
        sortOrder = sortOrder,
        file = loadedFile.toInternalFileMetadataResponse(),
    )
}

fun ObjectStorage.PresignedUrl.toInternalFileDownloadUrlResponse(): InternalFileDownloadUrlResponse {
    return InternalFileDownloadUrlResponse(
        url = url,
        expiresAt = expiresAt,
    )
}
