package ru.itplanet.trampline.moderation.dao.dto

import jakarta.persistence.*
import ru.itplanet.trampline.moderation.model.ModerationEntityType
import ru.itplanet.trampline.moderation.model.ModerationTaskPriority
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus
import ru.itplanet.trampline.moderation.model.ModerationTaskType
import java.time.OffsetDateTime

@Entity
@Table(name = "moderation_task")
open class ModerationTaskDto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false)
    var entityType: ModerationEntityType = ModerationEntityType.USER

    @Column(name = "entity_id", nullable = false)
    var entityId: Long = 0

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false)
    var taskType: ModerationTaskType = ModerationTaskType.USER_REVIEW

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: ModerationTaskStatus = ModerationTaskStatus.OPEN

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false)
    var priority: ModerationTaskPriority = ModerationTaskPriority.MEDIUM

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_user_id")
    var assigneeUser: ModerationUserRefDto? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    var createdByUser: ModerationUserRefDto? = null

    @Column(name = "resolution_comment")
    var resolutionComment: String? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: OffsetDateTime? = null

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime? = null

    @Column(name = "resolved_at")
    var resolvedAt: OffsetDateTime? = null
}
