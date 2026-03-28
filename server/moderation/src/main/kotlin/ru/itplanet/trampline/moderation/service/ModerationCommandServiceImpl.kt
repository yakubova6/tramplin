package ru.itplanet.trampline.moderation.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import com.fasterxml.jackson.databind.node.ObjectNode
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import ru.itplanet.trampline.commons.model.file.InternalCreateFileAttachmentRequest
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.moderation.CreateInternalModerationTaskRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationActionResultResponse
import ru.itplanet.trampline.commons.model.moderation.InternalModerationApproveRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRejectRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskResponse
import ru.itplanet.trampline.moderation.client.MediaServiceClient
import ru.itplanet.trampline.moderation.client.OpportunityModerationOwnerClient
import ru.itplanet.trampline.moderation.client.ProfileModerationOwnerClient
import ru.itplanet.trampline.moderation.dao.ModerationLogDao
import ru.itplanet.trampline.moderation.dao.ModerationTaskDao
import ru.itplanet.trampline.moderation.dao.dto.ModerationLogDto
import ru.itplanet.trampline.moderation.dao.dto.ModerationTaskDto
import ru.itplanet.trampline.moderation.dao.dto.ModerationUserRefDto
import ru.itplanet.trampline.moderation.dao.query.ModerationReadModelDao
import ru.itplanet.trampline.moderation.exception.ModerationTaskNotFoundException
import ru.itplanet.trampline.moderation.model.ModerationLogAction
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
    private val mediaServiceClient: MediaServiceClient,
    private val transactionTemplate: TransactionTemplate,
) : ModerationCommandService {

    @PersistenceContext
    private lateinit var entityManager: EntityManager

    @Transactional
    override fun createInternalTask(
        request: CreateInternalModerationTaskRequest,
    ): InternalModerationTaskResponse {
        val existingTask = moderationTaskDao.findActiveByKeyForUpdate(
            entityType = request.entityType,
            entityId = request.entityId,
            taskType = request.taskType,
            statuses = ACTIVE_TASK_STATUSES,
        ).firstOrNull()

        if (existingTask != null) {
            return existingTask.toInternalResponse(created = false)
        }

        val now = OffsetDateTime.now()
        val task = ModerationTaskDto().apply {
            entityType = request.entityType
            entityId = request.entityId
            taskType = request.taskType
            status = ModerationTaskStatus.OPEN
            priority = request.priority
            createdByUser = request.createdByUserId?.let { userReference(it) }
            createdAt = now
            updatedAt = now
        }

        moderationTaskDao.save(task)

        saveLog(
            task = task,
            action = ModerationLogAction.CREATED,
            actorUserId = request.createdByUserId,
            payload = buildInternalCreatedPayload(request),
            createdAt = now,
        )

        return task.toInternalResponse(created = true)
    }

    @Transactional
    override fun createManualTask(
        currentUser: AuthenticatedUser,
        request: CreateManualModerationTaskRequest,
    ): Long {
        val snapshot = moderationReadModelDao.findCurrentEntityState(
            request.entityType,
            request.entityId,
        )

        if (snapshot.path("notFound").asBoolean(false)) {
            throw ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Entity ${request.entityType.name}:${request.entityId} was not found",
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

    override fun addAttachment(
        taskId: Long,
        currentUser: AuthenticatedUser,
        file: MultipartFile,
    ) {
        ensureAttachmentCanBeAdded(taskId)

        val createdFile = mediaServiceClient.uploadFile(
            file = file,
            ownerUserId = currentUser.userId,
            kind = FileAssetKind.MODERATION_ATTACHMENT,
            visibility = FileAssetVisibility.PRIVATE,
        )

        val attachment = mediaServiceClient.createAttachment(
            InternalCreateFileAttachmentRequest(
                fileId = createdFile.fileId,
                entityType = FileAttachmentEntityType.MODERATION_TASK,
                entityId = taskId,
                attachmentRole = FileAttachmentRole.ATTACHMENT,
            ),
        )

        transactionTemplate.executeWithoutResult {
            val task = getTaskForUpdate(taskId)
            validateAttachmentAllowed(task)

            val now = OffsetDateTime.now()
            task.updatedAt = now
            moderationTaskDao.save(task)

            saveLog(
                task = task,
                action = ModerationLogAction.UPDATED,
                actorUserId = currentUser.userId,
                payload = buildAttachmentAddedPayload(attachment),
                createdAt = now,
            )
        }
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

    private fun ensureAttachmentCanBeAdded(taskId: Long) {
        transactionTemplate.executeWithoutResult {
            val task = getTaskForUpdate(taskId)
            validateAttachmentAllowed(task)
        }
    }

    private fun validateAttachmentAllowed(task: ModerationTaskDto) {
        if (task.status != ModerationTaskStatus.OPEN && task.status != ModerationTaskStatus.IN_PROGRESS) {
            throw conflict("Attachments can be added only to OPEN or IN_PROGRESS tasks")
        }
    }

    private fun buildAttachmentAddedPayload(
        attachment: InternalFileAttachmentResponse,
    ): ObjectNode {
        return JsonNodeFactory.instance.objectNode().apply {
            put("updateType", "ATTACHMENT_ADDED")
            put("attachmentId", attachment.attachmentId)
            put("fileId", attachment.fileId)
            put("originalFileName", attachment.file.originalFileName)
            put("mediaType", attachment.file.mediaType)
            put("sizeBytes", attachment.file.sizeBytes)
            put("attachmentRole", attachment.attachmentRole.name)
        }
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

    private fun buildInternalCreatedPayload(
        request: CreateInternalModerationTaskRequest,
    ): JsonNode {
        val payload = if (request.snapshot is ObjectNode) {
            request.snapshot.deepCopy<ObjectNode>()
        } else {
            JsonNodeFactory.instance.objectNode().apply {
                set<JsonNode>("snapshot", request.snapshot.deepCopy())
            }
        }

        payload.put("createdManually", false)
        payload.put("sourceService", request.sourceService.trim())
        payload.put("sourceAction", request.sourceAction.trim())
        request.createdByUserId?.let { payload.put("createdByUserId", it) }

        return payload
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
            ru.itplanet.trampline.commons.model.moderation.ModerationEntityType.EMPLOYER_PROFILE ->
                profileModerationOwnerClient.approveEmployerProfile(task.entityId, request)

            ru.itplanet.trampline.commons.model.moderation.ModerationEntityType.EMPLOYER_VERIFICATION ->
                profileModerationOwnerClient.approveEmployerVerification(task.entityId, request)

            ru.itplanet.trampline.commons.model.moderation.ModerationEntityType.OPPORTUNITY ->
                opportunityModerationOwnerClient.approveOpportunity(task.entityId, request)

            ru.itplanet.trampline.commons.model.moderation.ModerationEntityType.TAG ->
                opportunityModerationOwnerClient.approveTag(task.entityId, request)
        }
    }

    private fun dispatchReject(
        task: ModerationTaskDto,
        request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        return when (task.entityType) {
            ru.itplanet.trampline.commons.model.moderation.ModerationEntityType.EMPLOYER_PROFILE ->
                profileModerationOwnerClient.rejectEmployerProfile(task.entityId, request)

            ru.itplanet.trampline.commons.model.moderation.ModerationEntityType.EMPLOYER_VERIFICATION ->
                profileModerationOwnerClient.rejectEmployerVerification(task.entityId, request)

            ru.itplanet.trampline.commons.model.moderation.ModerationEntityType.OPPORTUNITY ->
                opportunityModerationOwnerClient.rejectOpportunity(task.entityId, request)

            ru.itplanet.trampline.commons.model.moderation.ModerationEntityType.TAG ->
                opportunityModerationOwnerClient.rejectTag(task.entityId, request)
        }
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

    private fun ModerationTaskDto.toInternalResponse(created: Boolean): InternalModerationTaskResponse {
        return InternalModerationTaskResponse(
            taskId = id ?: error("Task id must not be null"),
            created = created,
        )
    }

    private fun conflict(message: String): ResponseStatusException {
        return ResponseStatusException(HttpStatus.CONFLICT, message)
    }

    private fun forbidden(message: String): ResponseStatusException {
        return ResponseStatusException(HttpStatus.FORBIDDEN, message)
    }

    companion object {
        private val ACTIVE_TASK_STATUSES = listOf(
            ModerationTaskStatus.OPEN,
            ModerationTaskStatus.IN_PROGRESS,
        )
    }
}
