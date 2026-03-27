package ru.itplanet.trampline.moderation.dao.dto

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import ru.itplanet.trampline.moderation.model.ModerationEntityType
import ru.itplanet.trampline.moderation.model.ModerationLogAction
import java.time.OffsetDateTime

@Entity
@Table(name = "moderation_log")
open class ModerationLogDto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    var task: ModerationTaskDto? = null

    @Column(name = "task_id", insertable = false, updatable = false)
    var taskId: Long? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false)
    var entityType: ModerationEntityType = ModerationEntityType.EMPLOYER_PROFILE

    @Column(name = "entity_id", nullable = false)
    var entityId: Long = 0

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false)
    var action: ModerationLogAction = ModerationLogAction.CREATED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    var actorUser: ModerationUserRefDto? = null

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    var payload: JsonNode = JsonNodeFactory.instance.objectNode()

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: OffsetDateTime? = null
}
