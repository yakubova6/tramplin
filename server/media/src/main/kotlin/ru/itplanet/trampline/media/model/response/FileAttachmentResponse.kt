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
) {
    companion object {
        fun from(attachment: FileAttachmentDto): FileAttachmentResponse {
            return FileAttachmentResponse(
                attachmentId = attachment.id!!,
                fileId = attachment.fileId,
                entityType = attachment.entityType,
                entityId = attachment.entityId,
                attachmentRole = attachment.attachmentRole,
                sortOrder = attachment.sortOrder,
            )
        }
    }
}
