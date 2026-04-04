package ru.itplanet.trampline.moderation.model.request

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Positive
import org.springframework.format.annotation.DateTimeFormat
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus
import java.time.OffsetDateTime

data class GetModerationTasksRequest(
    val status: ModerationTaskStatus? = null,
    val taskType: ModerationTaskType? = null,
    val entityType: ModerationEntityType? = null,
    val priority: ModerationTaskPriority? = null,

    @field:Positive(message = "Идентификатор назначенного пользователя должен быть положительным")
    val assigneeUserId: Long? = null,

    val mine: Boolean? = null,

    @field:DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    val createdFrom: OffsetDateTime? = null,

    @field:DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    val createdTo: OffsetDateTime? = null,

    @field:Min(value = 0, message = "Параметр page не может быть отрицательным")
    val page: Int = 0,

    @field:Min(value = 1, message = "Параметр size должен быть не меньше 1")
    @field:Max(value = 100, message = "Параметр size должен быть не больше 100")
    val size: Int = 20,

    val sort: String? = "createdAt,DESC",
)
