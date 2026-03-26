package ru.itplanet.trampline.moderation.model.request

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Positive
import org.springframework.format.annotation.DateTimeFormat
import ru.itplanet.trampline.moderation.model.ModerationEntityType
import ru.itplanet.trampline.moderation.model.ModerationTaskPriority
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus
import ru.itplanet.trampline.moderation.model.ModerationTaskType
import java.time.OffsetDateTime

data class GetModerationTasksRequest(
    val status: ModerationTaskStatus? = null,
    val taskType: ModerationTaskType? = null,
    val entityType: ModerationEntityType? = null,
    val priority: ModerationTaskPriority? = null,
    @field:Positive
    val assigneeUserId: Long? = null,
    val mine: Boolean? = null,
    @field:DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    val createdFrom: OffsetDateTime? = null,
    @field:DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    val createdTo: OffsetDateTime? = null,
    @field:Min(0)
    val page: Int = 0,
    @field:Min(1)
    @field:Max(100)
    val size: Int = 20,
    val sort: String? = "createdAt,DESC"
)
