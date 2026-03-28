package ru.itplanet.trampline.commons.model.file

data class InternalFileAttachmentResponse(
    val attachmentId: Long,
    val fileId: Long,
    val entityType: FileAttachmentEntityType,
    val entityId: Long,
    val attachmentRole: FileAttachmentRole,
    val sortOrder: Int,
    val file: InternalFileMetadataResponse,
)
