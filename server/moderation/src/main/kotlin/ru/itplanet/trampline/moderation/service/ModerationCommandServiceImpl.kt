package ru.itplanet.trampline.moderation.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import com.fasterxml.jackson.databind.node.ObjectNode
import feign.FeignException
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.multipart.MultipartFile
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
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRequestChangesRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskResponse
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationFieldIssue
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.moderation.client.MediaServiceClient
import ru.itplanet.trampline.moderation.client.OpportunityModerationOwnerClient
import ru.itplanet.trampline.moderation.client.ProfileModerationOwnerClient
import ru.itplanet.trampline.moderation.dao.ModerationLogDao
import ru.itplanet.trampline.moderation.dao.ModerationTaskDao
import ru.itplanet.trampline.moderation.dao.dto.ModerationLogDto
import ru.itplanet.trampline.moderation.dao.dto.ModerationTaskDto
import ru.itplanet.trampline.moderation.dao.dto.ModerationUserRefDto
import ru.itplanet.trampline.moderation.dao.query.ModerationReadModelDao
import ru.itplanet.trampline.moderation.exception.ModerationBadRequestException
import ru.itplanet.trampline.moderation.exception.ModerationConflictException
import ru.itplanet.trampline.moderation.exception.ModerationForbiddenException
import ru.itplanet.trampline.moderation.exception.ModerationIntegrationException
import ru.itplanet.trampline.moderation.exception.ModerationNotFoundException
import ru.itplanet.trampline.moderation.exception.ModerationTaskNotFoundException
import ru.itplanet.trampline.moderation.model.ModerationLogAction
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus
import ru.itplanet.trampline.moderation.model.request.ApproveModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.AssignModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.CommentModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.CreateManualModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.RejectModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.RequestChangesModerationTaskRequest
import ru.itplanet.trampline.moderation.model.response.ModerationTaskAttachmentResponse
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
            throw ModerationNotFoundException(
                message = "Сущность ${request.entityType.name}:${request.entityId} не найдена",
                code = "moderated_entity_not_found",
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

        return task.id ?: throw IllegalStateException("Идентификатор задачи модерации не должен быть null")
    }

    @Transactional
    override fun assign(
        taskId: Long,
        currentUser: AuthenticatedUser,
        request: AssignModerationTaskRequest,
    ) {
        val task = getTaskForUpdate(taskId)
        ensureCurrentUserCanModerateTask(task, currentUser)

        if (task.status != ModerationTaskStatus.OPEN) {
            throw conflict(
                message = "Назначить можно только задачу модерации со статусом OPEN",
                code = "task_assign_not_allowed",
            )
        }

        val currentAssigneeId = task.assigneeUser?.id
        if (currentAssigneeId != null && currentAssigneeId != currentUser.userId) {
            throw conflict(
                message = "Задача $taskId уже назначена другому куратору",
                code = "task_already_assigned",
            )
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
        ensureCurrentUserCanModerateTask(task, currentUser)
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
    override fun requestChanges(
        taskId: Long,
        currentUser: AuthenticatedUser,
        request: RequestChangesModerationTaskRequest,
    ) {
        val task = getTaskForUpdate(taskId)
        ensureCurrentUserCanModerateTask(task, currentUser)
        ensureTaskCanBeResolved(task, currentUser)

        dispatchRequestChanges(
            task = task,
            request = InternalModerationRequestChangesRequest(
                taskId = taskId,
                moderatorUserId = currentUser.userId,
                comment = request.comment.trim(),
                reasonCode = request.reasonCode.trim(),
                fieldIssues = request.fieldIssues,
                notifyUser = request.notifyUser,
            ),
        )

        val now = OffsetDateTime.now()
        val previousStatus = task.status

        if (task.assigneeUser == null) {
            task.assigneeUser = userReference(currentUser.userId)
        }
        task.status = ModerationTaskStatus.NEEDS_REVISION
        task.resolutionComment = request.comment.trim()
        task.resolvedAt = now
        task.updatedAt = now

        moderationTaskDao.save(task)

        saveLog(
            task = task,
            action = ModerationLogAction.REQUESTED_CHANGES,
            actorUserId = currentUser.userId,
            payload = JsonNodeFactory.instance.objectNode().apply {
                put("comment", request.comment.trim())
                put("reasonCode", request.reasonCode.trim())
                put("notifyUser", request.notifyUser)
                put("statusFrom", previousStatus.name)
                put("statusTo", task.status.name)
                set<JsonNode>("fieldIssues", buildFieldIssuesNode(request.fieldIssues))
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
        ensureCurrentUserCanModerateTask(task, currentUser)
        ensureTaskCanBeResolved(task, currentUser)
        ensureRejectSupported(task)

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
        ensureCurrentUserCanModerateTask(task, currentUser)

        if (task.status != ModerationTaskStatus.OPEN && task.status != ModerationTaskStatus.IN_PROGRESS) {
            throw conflict(
                message = "Комментировать можно только задачи со статусом OPEN или IN_PROGRESS",
                code = "task_comment_not_allowed",
            )
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
        ensureAttachmentCanBeModified(taskId, currentUser)

        val createdFile = try {
            mediaServiceClient.uploadFile(
                file = file,
                ownerUserId = currentUser.userId,
                kind = FileAssetKind.MODERATION_ATTACHMENT,
                visibility = FileAssetVisibility.AUTHENTICATED,
            )
        } catch (ex: FeignException) {
            throw translateMediaServiceException(ex)
        }

        val attachment = try {
            mediaServiceClient.createAttachment(
                InternalCreateFileAttachmentRequest(
                    fileId = createdFile.fileId,
                    entityType = FileAttachmentEntityType.MODERATION_TASK,
                    entityId = taskId,
                    attachmentRole = FileAttachmentRole.ATTACHMENT,
                ),
            )
        } catch (ex: FeignException) {
            throw translateMediaServiceException(ex)
        }

        transactionTemplate.executeWithoutResult {
            val task = getTaskForUpdate(taskId)
            ensureCurrentUserCanModerateTask(task, currentUser)
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

    override fun deleteAttachment(
        taskId: Long,
        currentUser: AuthenticatedUser,
        attachmentId: Long,
    ) {
        ensureAttachmentCanBeModified(taskId, currentUser)

        val attachment = loadTaskAttachment(taskId, attachmentId)

        try {
            mediaServiceClient.deleteAttachment(attachment.id)
        } catch (ex: FeignException) {
            throw translateMediaServiceException(ex)
        }

        transactionTemplate.executeWithoutResult {
            val task = getTaskForUpdate(taskId)
            ensureCurrentUserCanModerateTask(task, currentUser)
            validateAttachmentAllowed(task)

            val now = OffsetDateTime.now()
            task.updatedAt = now
            moderationTaskDao.save(task)

            saveLog(
                task = task,
                action = ModerationLogAction.UPDATED,
                actorUserId = currentUser.userId,
                payload = buildAttachmentDeletedPayload(attachment),
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
        ensureCurrentUserCanModerateTask(task, currentUser)

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

        if (
            task.status == ModerationTaskStatus.APPROVED ||
            task.status == ModerationTaskStatus.REJECTED ||
            task.status == ModerationTaskStatus.NEEDS_REVISION
        ) {
            throw conflict(
                message = "Решённую задачу модерации нельзя отменить",
                code = "resolved_task_cancel_not_allowed",
            )
        }

        cancelTask(
            task = task,
            actorUserId = null,
            actorType = "INTERNAL",
        )
    }

    private fun ensureAttachmentCanBeModified(
        taskId: Long,
        currentUser: AuthenticatedUser,
    ) {
        transactionTemplate.executeWithoutResult {
            val task = getTaskForUpdate(taskId)
            ensureCurrentUserCanModerateTask(task, currentUser)
            validateAttachmentAllowed(task)
        }
    }

    private fun validateAttachmentAllowed(task: ModerationTaskDto) {
        if (task.status != ModerationTaskStatus.OPEN && task.status != ModerationTaskStatus.IN_PROGRESS) {
            throw conflict(
                message = "Вложения можно добавлять и удалять только у задач со статусом OPEN или IN_PROGRESS",
                code = "task_attachment_update_not_allowed",
            )
        }
    }

    private fun loadTaskAttachment(
        taskId: Long,
        attachmentId: Long,
    ): ModerationTaskAttachmentResponse {
        return moderationReadModelDao.findTaskAttachments(taskId)
            .firstOrNull { attachment ->
                attachment.id == attachmentId && attachment.attachmentRole == FileAttachmentRole.ATTACHMENT.name
            }
            ?: throw ModerationNotFoundException(
                message = "Вложение задачи модерации не найдено",
                code = "moderation_attachment_not_found",
            )
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

    private fun buildAttachmentDeletedPayload(
        attachment: ModerationTaskAttachmentResponse,
    ): ObjectNode {
        return JsonNodeFactory.instance.objectNode().apply {
            put("updateType", "ATTACHMENT_DELETED")
            put("attachmentId", attachment.id)
            put("fileId", attachment.fileId)
            put("originalFileName", attachment.originalFileName)
            put("mediaType", attachment.mediaType)
            put("sizeBytes", attachment.sizeBytes)
            put("visibility", attachment.visibility)
            put("status", attachment.status)
            put("attachmentRole", attachment.attachmentRole)
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
        return try {
            when (task.entityType) {
                ModerationEntityType.APPLICANT_PROFILE ->
                    profileModerationOwnerClient.approveApplicantProfile(task.entityId, request)

                ModerationEntityType.EMPLOYER_PROFILE ->
                    profileModerationOwnerClient.approveEmployerProfile(task.entityId, request)

                ModerationEntityType.EMPLOYER_VERIFICATION ->
                    profileModerationOwnerClient.approveEmployerVerification(task.entityId, request)

                ModerationEntityType.OPPORTUNITY ->
                    opportunityModerationOwnerClient.approveOpportunity(task.entityId, request)

                ModerationEntityType.TAG ->
                    opportunityModerationOwnerClient.approveTag(task.entityId, request)
            }
        } catch (ex: FeignException) {
            throw translateOwnerServiceException(ex)
        }
    }

    private fun dispatchRequestChanges(
        task: ModerationTaskDto,
        request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse {
        return try {
            when (task.entityType) {
                ModerationEntityType.APPLICANT_PROFILE ->
                    profileModerationOwnerClient.requestChangesApplicantProfile(task.entityId, request)

                ModerationEntityType.EMPLOYER_PROFILE ->
                    profileModerationOwnerClient.requestChangesEmployerProfile(task.entityId, request)

                ModerationEntityType.EMPLOYER_VERIFICATION ->
                    profileModerationOwnerClient.requestChangesEmployerVerification(task.entityId, request)

                ModerationEntityType.OPPORTUNITY ->
                    opportunityModerationOwnerClient.requestChangesOpportunity(task.entityId, request)

                ModerationEntityType.TAG ->
                    opportunityModerationOwnerClient.requestChangesTag(task.entityId, request)
            }
        } catch (ex: FeignException) {
            throw translateOwnerServiceException(ex)
        }
    }

    private fun dispatchReject(
        task: ModerationTaskDto,
        request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        return try {
            when (task.entityType) {
                ModerationEntityType.APPLICANT_PROFILE ->
                    profileModerationOwnerClient.rejectApplicantProfile(task.entityId, request)

                ModerationEntityType.EMPLOYER_PROFILE ->
                    profileModerationOwnerClient.rejectEmployerProfile(task.entityId, request)

                ModerationEntityType.EMPLOYER_VERIFICATION ->
                    profileModerationOwnerClient.rejectEmployerVerification(task.entityId, request)

                ModerationEntityType.OPPORTUNITY ->
                    opportunityModerationOwnerClient.rejectOpportunity(task.entityId, request)

                ModerationEntityType.TAG ->
                    opportunityModerationOwnerClient.rejectTag(task.entityId, request)
            }
        } catch (ex: FeignException) {
            throw translateOwnerServiceException(ex)
        }
    }

    private fun buildFieldIssuesNode(
        fieldIssues: List<ModerationFieldIssue>,
    ): JsonNode {
        val arrayNode = JsonNodeFactory.instance.arrayNode()

        fieldIssues.forEach { issue ->
            arrayNode.add(
                JsonNodeFactory.instance.objectNode().apply {
                    put("field", issue.field)
                    put("message", issue.message)
                    issue.code?.let { put("code", it) }
                },
            )
        }

        return arrayNode
    }

    private fun ensureTaskCanBeResolved(
        task: ModerationTaskDto,
        currentUser: AuthenticatedUser,
    ) {
        if (task.status != ModerationTaskStatus.OPEN && task.status != ModerationTaskStatus.IN_PROGRESS) {
            throw conflict(
                message = "Одобрить или отклонить можно только задачи со статусом OPEN или IN_PROGRESS",
                code = "task_resolve_not_allowed",
            )
        }

        val assigneeId = task.assigneeUser?.id
        if (
            task.status == ModerationTaskStatus.IN_PROGRESS &&
            assigneeId != null &&
            assigneeId != currentUser.userId &&
            currentUser.role != Role.ADMIN
        ) {
            throw forbidden(
                message = "Задача ${task.id} назначена другому куратору",
                code = "task_assigned_to_another_curator",
            )
        }
    }

    private fun ensureTaskCanBeCancelled(
        task: ModerationTaskDto,
        currentUser: AuthenticatedUser,
    ) {
        if (
            task.status == ModerationTaskStatus.APPROVED ||
            task.status == ModerationTaskStatus.REJECTED ||
            task.status == ModerationTaskStatus.NEEDS_REVISION
        ) {
            throw conflict(
                message = "Решённую задачу модерации нельзя отменить",
                code = "resolved_task_cancel_not_allowed",
            )
        }

        if (task.status != ModerationTaskStatus.OPEN && task.status != ModerationTaskStatus.IN_PROGRESS) {
            throw conflict(
                message = "Отменить можно только задачу модерации со статусом OPEN или IN_PROGRESS",
                code = "task_cancel_not_allowed",
            )
        }

        val assigneeId = task.assigneeUser?.id
        if (
            task.status == ModerationTaskStatus.IN_PROGRESS &&
            assigneeId != null &&
            assigneeId != currentUser.userId &&
            currentUser.role != Role.ADMIN
        ) {
            throw forbidden(
                message = "Задача ${task.id} назначена другому куратору",
                code = "task_assigned_to_another_curator",
            )
        }
    }

    private fun ensureCurrentUserCanModerateTask(
        task: ModerationTaskDto,
        currentUser: AuthenticatedUser,
    ) {
        if (isOwnCreatedTagTask(task, currentUser)) {
            throw ModerationTaskNotFoundException(task.id ?: 0L)
        }
    }

    private fun ensureRejectSupported(task: ModerationTaskDto) {
        if (!supportsHardReject(task.entityType)) {
            throw conflict(
                message = "Для модерации профилей используйте сценарий запроса доработки. Жёсткое отклонение профиля не поддерживается",
                code = "profile_reject_not_supported",
            )
        }
    }

    private fun supportsHardReject(entityType: ModerationEntityType): Boolean {
        return when (entityType) {
            ModerationEntityType.APPLICANT_PROFILE,
            ModerationEntityType.EMPLOYER_PROFILE -> false

            ModerationEntityType.EMPLOYER_VERIFICATION,
            ModerationEntityType.OPPORTUNITY,
            ModerationEntityType.TAG -> true
        }
    }

    private fun isOwnCreatedTagTask(
        task: ModerationTaskDto,
        currentUser: AuthenticatedUser,
    ): Boolean {
        return task.entityType == ModerationEntityType.TAG &&
                task.createdByUser?.id == currentUser.userId
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
            taskId = id ?: throw IllegalStateException("Идентификатор задачи модерации не должен быть null"),
            created = created,
        )
    }

    private fun conflict(
        message: String,
        code: String,
    ): ModerationConflictException {
        return ModerationConflictException(
            message = message,
            code = code,
        )
    }

    private fun forbidden(
        message: String,
        code: String,
    ): ModerationForbiddenException {
        return ModerationForbiddenException(
            message = message,
            code = code,
        )
    }

    private fun translateOwnerServiceException(ex: FeignException): RuntimeException {
        return when (ex.status()) {
            HttpStatus.BAD_REQUEST.value() -> ModerationBadRequestException(
                message = "Запрос модерации заполнен некорректно",
                code = "moderation_action_invalid",
            )

            HttpStatus.FORBIDDEN.value() -> ModerationForbiddenException(
                message = "Действие модерации запрещено",
                code = "moderation_action_forbidden",
            )

            HttpStatus.NOT_FOUND.value() -> ModerationNotFoundException(
                message = "Связанная сущность не найдена",
                code = "moderated_entity_not_found",
            )

            HttpStatus.CONFLICT.value() -> ModerationConflictException(
                message = "Состояние связанной сущности не позволяет выполнить действие",
                code = "moderated_entity_state_conflict",
            )

            else -> ModerationIntegrationException(
                message = "Сервис владельца сущности временно недоступен",
                code = "moderation_owner_service_unavailable",
                status = HttpStatus.SERVICE_UNAVAILABLE,
            )
        }
    }

    private fun translateMediaServiceException(ex: FeignException): RuntimeException {
        return when (ex.status()) {
            HttpStatus.NOT_FOUND.value() -> ModerationNotFoundException(
                message = "Вложение задачи модерации не найдено",
                code = "moderation_attachment_not_found",
            )

            HttpStatus.CONFLICT.value() -> ModerationConflictException(
                message = "Состояние вложения не позволяет выполнить действие",
                code = "moderation_attachment_state_conflict",
            )

            else -> ModerationIntegrationException(
                message = "Media-сервис временно недоступен",
                code = "media_service_unavailable",
                status = HttpStatus.SERVICE_UNAVAILABLE,
            )
        }
    }

    companion object {
        private val ACTIVE_TASK_STATUSES = listOf(
            ModerationTaskStatus.OPEN,
            ModerationTaskStatus.IN_PROGRESS,
        )
    }
}
