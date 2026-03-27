package ru.itplanet.trampline.moderation.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import com.fasterxml.jackson.databind.node.ObjectNode
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.moderation.InternalModerationActionResultResponse
import ru.itplanet.trampline.commons.model.moderation.InternalModerationApproveRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRejectRequest
import ru.itplanet.trampline.moderation.client.OpportunityModerationOwnerClient
import ru.itplanet.trampline.moderation.client.ProfileModerationOwnerClient
import ru.itplanet.trampline.moderation.dao.ModerationLogDao
import ru.itplanet.trampline.moderation.dao.ModerationTaskDao
import ru.itplanet.trampline.moderation.dao.dto.ModerationLogDto
import ru.itplanet.trampline.moderation.dao.dto.ModerationTaskDto
import ru.itplanet.trampline.moderation.dao.dto.ModerationUserRefDto
import ru.itplanet.trampline.moderation.dao.query.ModerationReadModelDao
import ru.itplanet.trampline.moderation.exception.ModerationTaskNotFoundException
import ru.itplanet.trampline.moderation.model.ModerationEntityType
import ru.itplanet.trampline.moderation.model.ModerationLogAction
import ru.itplanet.trampline.moderation.model.ModerationSeverity
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus
import ru.itplanet.trampline.moderation.model.request.ApproveModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.AssignModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.CommentModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.CreateManualModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.RejectModerationTaskRequest
import ru.itplanet.trampline.moderation.security.AuthenticatedUser
import java.time.OffsetDateTime

@Service
class ModerationCommandServiceImpl(
    private val moderationTaskDao: ModerationTaskDao,
    private val moderationLogDao: ModerationLogDao,
    private val moderationReadModelDao: ModerationReadModelDao,
    private val profileModerationOwnerClient: ProfileModerationOwnerClient,
    private val opportunityModerationOwnerClient: OpportunityModerationOwnerClient,
) : ModerationCommandService {

    @PersistenceContext
    private lateinit var entityManager: EntityManager

    @Transactional
    override fun createManualTask(
        currentUser: AuthenticatedUser,
        request: CreateManualModerationTaskRequest,
    ): Long {
        val snapshot = moderationReadModelDao.findCurrentEntityState(
            request.entityType,
            request.entityId
        )

        if (snapshot.path("notFound").asBoolean(false)) {
            throw ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Entity ${request.entityType.name}:${request.entityId} was not found"
            )
        }

        val now = OffsetDateTime.now()
        val task = ModerationTaskDto().apply {
            entityType = request.entityType
            entityId = request.entityId
            taskType = request.taskType
            status = ModerationTaskStatus.OPEN
            priority = request.priority
            createdByUser = userReference(currentUser.userId)
            createdAt = now
            updatedAt = now
        }

        moderationTaskDao.save(task)

        saveLog(
            task = task,
            action = ModerationLogAction.CREATED,
            actorUserId = currentUser.userId,
            payload = buildManualCreatedPayload(snapshot, request.comment.trim()),
            createdAt = now,
        )

        return task.id ?: error("Task id must not be null")
    }

    @Transactional
    override fun assign(
        taskId: Long,
        currentUser: AuthenticatedUser,
        request: AssignModerationTaskRequest,
    ) {
        val task = getTaskForUpdate(taskId)

        if (task.status != ModerationTaskStatus.OPEN) {
            throw conflict("Only OPEN moderation tasks can be assigned")
        }

        val currentAssigneeId = task.assigneeUser?.id
        if (currentAssigneeId != null && currentAssigneeId != currentUser.userId) {
            throw conflict("Task $taskId is already assigned to another curator")
        }

        val now = OffsetDateTime.now()
        val previousStatus = task.status

        task.assigneeUser = userReference(currentUser.userId)
        task.status = ModerationTaskStatus.IN_PROGRESS
        task.updatedAt = now

        moderationTaskDao.save(task)

        saveLog(
            task = task,
            action = ModerationLogAction.ASSIGNED,
            actorUserId = currentUser.userId,
            payload = JsonNodeFactory.instance.objectNode().apply {
                put("comment", request.comment.trim())
                put("statusFrom", previousStatus.name)
                put("statusTo", task.status.name)
                put("assigneeUserId", currentUser.userId)
            },
            createdAt = now,
        )
    }

    @Transactional
    override fun approve(
        taskId: Long,
        currentUser: AuthenticatedUser,
        request: ApproveModerationTaskRequest,
    ) {
        val task = getTaskForUpdate(taskId)
        ensureTaskCanBeResolved(task, currentUser)

        dispatchApprove(
            task = task,
            request = InternalModerationApproveRequest(
                taskId = taskId,
                moderatorUserId = currentUser.userId,
                comment = request.comment.trim(),
                reasonCode = request.reasonCode.trim(),
                applyPatch = request.applyPatch.deepCopy(),
                notifyUser = request.notifyUser,
            ),
        )

        val now = OffsetDateTime.now()
        val previousStatus = task.status

        if (task.assigneeUser == null) {
            task.assigneeUser = userReference(currentUser.userId)
        }
        task.status = ModerationTaskStatus.APPROVED
        task.resolutionComment = request.comment.trim()
        task.resolvedAt = now
        task.updatedAt = now

        moderationTaskDao.save(task)

        saveLog(
            task = task,
            action = ModerationLogAction.APPROVED,
            actorUserId = currentUser.userId,
            payload = JsonNodeFactory.instance.objectNode().apply {
                put("comment", request.comment.trim())
                put("reasonCode", request.reasonCode.trim())
                put("notifyUser", request.notifyUser)
                put("statusFrom", previousStatus.name)
                put("statusTo", task.status.name)
                set<JsonNode>("applyPatch", request.applyPatch.deepCopy())
            },
            createdAt = now,
        )
    }

    @Transactional
    override fun reject(
        taskId: Long,
        currentUser: AuthenticatedUser,
        request: RejectModerationTaskRequest,
    ) {
        val task = getTaskForUpdate(taskId)
        ensureTaskCanBeResolved(task, currentUser)

        val ownerActionResult = dispatchReject(
            task = task,
            request = InternalModerationRejectRequest(
                taskId = taskId,
                moderatorUserId = currentUser.userId,
                comment = request.comment.trim(),
                reasonCode = request.reasonCode.trim(),
                severity = request.severity.name,
                notifyUser = request.notifyUser,
            ),
        )

        val now = OffsetDateTime.now()
        val previousStatus = task.status

        if (task.assigneeUser == null) {
            task.assigneeUser = userReference(currentUser.userId)
        }
        task.status = ModerationTaskStatus.REJECTED
        task.resolutionComment = request.comment.trim()
        task.resolvedAt = now
        task.updatedAt = now

        moderationTaskDao.save(task)

        saveLog(
            task = task,
            action = ModerationLogAction.REJECTED,
            actorUserId = currentUser.userId,
            payload = JsonNodeFactory.instance.objectNode().apply {
                put("comment", request.comment.trim())
                put("reasonCode", request.reasonCode.trim())
                put("severity", request.severity.name)
                put("notifyUser", request.notifyUser)
                put("statusFrom", previousStatus.name)
                put("statusTo", task.status.name)
                ownerActionResult.affectedUserId?.let { put("affectedUserId", it) }
            },
            createdAt = now,
        )
    }

    @Transactional
    override fun comment(
        taskId: Long,
        currentUser: AuthenticatedUser,
        request: CommentModerationTaskRequest,
    ) {
        val task = getTaskForUpdate(taskId)

        if (task.status != ModerationTaskStatus.OPEN && task.status != ModerationTaskStatus.IN_PROGRESS) {
            throw conflict("Comments can be added only to OPEN or IN_PROGRESS tasks")
        }

        val now = OffsetDateTime.now()
        task.updatedAt = now
        moderationTaskDao.save(task)

        saveLog(
            task = task,
            action = ModerationLogAction.COMMENTED,
            actorUserId = currentUser.userId,
            payload = JsonNodeFactory.instance.objectNode().apply {
                put("text", request.text.trim())
            },
            createdAt = now,
        )
    }

    @Transactional
    override fun cancel(
        taskId: Long,
        currentUser: AuthenticatedUser,
    ) {
        val task = getTaskForUpdate(taskId)

        if (task.status == ModerationTaskStatus.CANCELLED) {
            return
        }

        ensureTaskCanBeCancelled(task, currentUser)

        cancelTask(
            task = task,
            actorUserId = currentUser.userId,
            actorType = currentUser.role.name,
        )
    }

    @Transactional
    override fun cancelByInternal(taskId: Long) {
        val task = getTaskForUpdate(taskId)

        if (task.status == ModerationTaskStatus.CANCELLED) {
            return
        }

        if (task.status == ModerationTaskStatus.APPROVED || task.status == ModerationTaskStatus.REJECTED) {
            throw conflict("Resolved moderation task cannot be cancelled")
        }

        cancelTask(
            task = task,
            actorUserId = null,
            actorType = "INTERNAL",
        )
    }

    private fun cancelTask(
        task: ModerationTaskDto,
        actorUserId: Long?,
        actorType: String,
    ) {
        val now = OffsetDateTime.now()
        val previousStatus = task.status

        task.status = ModerationTaskStatus.CANCELLED
        task.resolvedAt = now
        task.updatedAt = now

        moderationTaskDao.save(task)

        saveLog(
            task = task,
            action = ModerationLogAction.STATUS_CHANGED,
            actorUserId = actorUserId,
            payload = JsonNodeFactory.instance.objectNode().apply {
                put("statusFrom", previousStatus.name)
                put("statusTo", task.status.name)
                put("actorType", actorType)
            },
            createdAt = now,
        )
    }

    private fun buildManualCreatedPayload(
        snapshot: JsonNode,
        comment: String,
    ): JsonNode {
        val payload = if (snapshot is ObjectNode) {
            snapshot.deepCopy<ObjectNode>()
        } else {
            JsonNodeFactory.instance.objectNode().apply {
                set<JsonNode>("snapshot", snapshot.deepCopy())
            }
        }

        payload.put("createdManually", true)
        payload.put("manualComment", comment)

        return payload
    }

    private fun dispatchApprove(
        task: ModerationTaskDto,
        request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        return when (task.entityType) {
            ModerationEntityType.EMPLOYER_PROFILE ->
                profileModerationOwnerClient.approveEmployerProfile(task.entityId, request)

            ModerationEntityType.EMPLOYER_VERIFICATION ->
                profileModerationOwnerClient.approveEmployerVerification(task.entityId, request)

            ModerationEntityType.OPPORTUNITY ->
                opportunityModerationOwnerClient.approveOpportunity(task.entityId, request)

            ModerationEntityType.TAG ->
                opportunityModerationOwnerClient.approveTag(task.entityId, request)
        }
    }

    private fun dispatchReject(
        task: ModerationTaskDto,
        request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        return when (task.entityType) {
            ModerationEntityType.EMPLOYER_PROFILE ->
                profileModerationOwnerClient.rejectEmployerProfile(task.entityId, request)

            ModerationEntityType.EMPLOYER_VERIFICATION ->
                profileModerationOwnerClient.rejectEmployerVerification(task.entityId, request)

            ModerationEntityType.OPPORTUNITY ->
                opportunityModerationOwnerClient.rejectOpportunity(task.entityId, request)

            ModerationEntityType.TAG ->
                opportunityModerationOwnerClient.rejectTag(task.entityId, request)
        }
    }

    private fun shouldBlockRelatedUser(
        task: ModerationTaskDto,
        request: RejectModerationTaskRequest,
        ownerActionResult: InternalModerationActionResultResponse,
    ): Boolean {
        return request.severity == ModerationSeverity.CRITICAL &&
                ownerActionResult.affectedUserId != null
    }

    private fun ensureTaskCanBeResolved(
        task: ModerationTaskDto,
        currentUser: AuthenticatedUser,
    ) {
        if (task.status != ModerationTaskStatus.OPEN && task.status != ModerationTaskStatus.IN_PROGRESS) {
            throw conflict("Only OPEN or IN_PROGRESS moderation tasks can be resolved")
        }

        val assigneeId = task.assigneeUser?.id
        if (
            task.status == ModerationTaskStatus.IN_PROGRESS &&
            assigneeId != null &&
            assigneeId != currentUser.userId &&
            currentUser.role != Role.ADMIN
        ) {
            throw forbidden("Task ${task.id} is assigned to another curator")
        }
    }

    private fun ensureTaskCanBeCancelled(
        task: ModerationTaskDto,
        currentUser: AuthenticatedUser,
    ) {
        if (task.status == ModerationTaskStatus.APPROVED || task.status == ModerationTaskStatus.REJECTED) {
            throw conflict("Resolved moderation task cannot be cancelled")
        }

        if (task.status != ModerationTaskStatus.OPEN && task.status != ModerationTaskStatus.IN_PROGRESS) {
            throw conflict("Only OPEN or IN_PROGRESS moderation tasks can be cancelled")
        }

        val assigneeId = task.assigneeUser?.id
        if (
            task.status == ModerationTaskStatus.IN_PROGRESS &&
            assigneeId != null &&
            assigneeId != currentUser.userId &&
            currentUser.role != Role.ADMIN
        ) {
            throw forbidden("Task ${task.id} is assigned to another curator")
        }
    }

    private fun getTaskForUpdate(taskId: Long): ModerationTaskDto {
        return moderationTaskDao.findByIdForUpdate(taskId)
            ?: throw ModerationTaskNotFoundException(taskId)
    }

    private fun saveLog(
        task: ModerationTaskDto,
        action: ModerationLogAction,
        actorUserId: Long?,
        payload: JsonNode,
        createdAt: OffsetDateTime,
    ) {
        val log = ModerationLogDto().apply {
            this.task = task
            this.entityType = task.entityType
            this.entityId = task.entityId
            this.action = action
            this.actorUser = actorUserId?.let { userReference(it) }
            this.payload = payload
            this.createdAt = createdAt
        }

        moderationLogDao.save(log)
    }

    private fun userReference(userId: Long): ModerationUserRefDto {
        return entityManager.getReference(ModerationUserRefDto::class.java, userId)
    }

    private fun conflict(message: String): ResponseStatusException {
        return ResponseStatusException(HttpStatus.CONFLICT, message)
    }

    private fun forbidden(message: String): ResponseStatusException {
        return ResponseStatusException(HttpStatus.FORBIDDEN, message)
    }
}
