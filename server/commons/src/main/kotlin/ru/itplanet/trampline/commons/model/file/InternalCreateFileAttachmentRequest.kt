package ru.itplanet.trampline.commons.model.file

import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero

data class InternalCreateFileAttachmentRequest(
    @field:Positive(message = "Идентификатор файла должен быть положительным")
    val fileId: Long,

    val entityType: FileAttachmentEntityType,

    @field:Positive(message = "Идентификатор сущности должен быть положительным")
    val entityId: Long,

    val attachmentRole: FileAttachmentRole,

    @field:PositiveOrZero(message = "Порядок сортировки не может быть отрицательным")
    val sortOrder: Int = 0,
)
