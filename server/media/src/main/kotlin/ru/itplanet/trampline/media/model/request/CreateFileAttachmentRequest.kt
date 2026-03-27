package ru.itplanet.trampline.media.model.request

import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole

data class CreateFileAttachmentRequest(
    @field:Positive
    val fileId: Long,

    val entityType: FileAttachmentEntityType,

    @field:Positive
    val entityId: Long,

    val attachmentRole: FileAttachmentRole,

    @field:PositiveOrZero
    val sortOrder: Int = 0,
)
