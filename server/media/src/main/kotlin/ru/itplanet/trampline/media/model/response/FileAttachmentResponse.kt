package ru.itplanet.trampline.media.model.response

import ru.itplanet.trampline.commons.dao.dto.FileAttachmentDto
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole

data class FileAttachmentResponse(
    val attachmentId: Long,
    val fileId: Long,
    val entityType: FileAttachmentEntityType,
    val entityId: Long,
    val attachmentRole: FileAttachmentRole,
    val sortOrder: Int,
    val file: FileMetadataResponse,
) {
    companion object {
        fun from(attachment: FileAttachmentDto): FileAttachmentResponse {
            val file = attachment.file
                ?: throw IllegalStateException("File relation is not loaded for attachment ${attachment.id}")

            return FileAttachmentResponse(
                attachmentId = attachment.id!!,
                fileId = attachment.fileId,
                entityType = attachment.entityType,
                entityId = attachment.entityId,
                attachmentRole = attachment.attachmentRole,
                sortOrder = attachment.sortOrder,
                file = FileMetadataResponse.from(file),
            )
        }
    }
}
