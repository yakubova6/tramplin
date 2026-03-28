package ru.itplanet.trampline.commons.model.file

import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero

data class InternalCreateFileAttachmentRequest(
    @field:Positive
    val fileId: Long,

    val entityType: FileAttachmentEntityType,

    @field:Positive
    val entityId: Long,

    val attachmentRole: FileAttachmentRole,

    @field:PositiveOrZero
    val sortOrder: Int = 0,
)
