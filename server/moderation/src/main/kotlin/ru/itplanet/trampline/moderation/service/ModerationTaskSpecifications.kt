package ru.itplanet.trampline.moderation.service

import jakarta.persistence.criteria.JoinType
import org.springframework.data.jpa.domain.Specification
import ru.itplanet.trampline.moderation.dao.dto.ModerationTaskDto
import ru.itplanet.trampline.moderation.dao.dto.ModerationUserRefDto
import ru.itplanet.trampline.moderation.model.ModerationEntityType
import ru.itplanet.trampline.moderation.model.ModerationTaskPriority
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus
import ru.itplanet.trampline.moderation.model.ModerationTaskType
import ru.itplanet.trampline.moderation.model.request.GetModerationTasksRequest
import java.time.OffsetDateTime

object ModerationTaskSpecifications {

    fun build(
        request: GetModerationTasksRequest,
        currentUserId: Long
    ): Specification<ModerationTaskDto> {
        return Specification.allOf(
            listOfNotNull(
                withStatus(request.status),
                withTaskType(request.taskType),
                withEntityType(request.entityType),
                withPriority(request.priority),
                withAssignee(resolveAssigneeUserId(request, currentUserId)),
                withCreatedFrom(request.createdFrom),
                withCreatedTo(request.createdTo)
            )
        )
    }

    private fun resolveAssigneeUserId(
        request: GetModerationTasksRequest,
        currentUserId: Long
    ): Long? {
        return if (request.mine == true) currentUserId else request.assigneeUserId
    }

    private fun withStatus(
        status: ModerationTaskStatus?
    ): Specification<ModerationTaskDto>? {
        return status?.let {
            Specification { root, _, cb ->
                cb.equal(root.get<ModerationTaskStatus>("status"), it)
            }
        }
    }

    private fun withTaskType(
        taskType: ModerationTaskType?
    ): Specification<ModerationTaskDto>? {
        return taskType?.let {
            Specification { root, _, cb ->
                cb.equal(root.get<ModerationTaskType>("taskType"), it)
            }
        }
    }

    private fun withEntityType(
        entityType: ModerationEntityType?
    ): Specification<ModerationTaskDto>? {
        return entityType?.let {
            Specification { root, _, cb ->
                cb.equal(root.get<ModerationEntityType>("entityType"), it)
            }
        }
    }

    private fun withPriority(
        priority: ModerationTaskPriority?
    ): Specification<ModerationTaskDto>? {
        return priority?.let {
            Specification { root, _, cb ->
                cb.equal(root.get<ModerationTaskPriority>("priority"), it)
            }
        }
    }

    private fun withAssignee(
        assigneeUserId: Long?
    ): Specification<ModerationTaskDto>? {
        return assigneeUserId?.let {
            Specification { root, _, cb ->
                val assigneeJoin = root.join<ModerationTaskDto, ModerationUserRefDto>(
                    "assigneeUser",
                    JoinType.LEFT
                )
                cb.equal(assigneeJoin.get<Long>("id"), it)
            }
        }
    }

    private fun withCreatedFrom(
        createdFrom: OffsetDateTime?
    ): Specification<ModerationTaskDto>? {
        return createdFrom?.let {
            Specification { root, _, cb ->
                cb.greaterThanOrEqualTo(root.get("createdAt"), it)
            }
        }
    }

    private fun withCreatedTo(
        createdTo: OffsetDateTime?
    ): Specification<ModerationTaskDto>? {
        return createdTo?.let {
            Specification { root, _, cb ->
                cb.lessThanOrEqualTo(root.get("createdAt"), it)
            }
        }
    }
}
