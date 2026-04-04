package ru.itplanet.trampline.moderation.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.file.InternalFileDownloadUrlResponse
import ru.itplanet.trampline.commons.model.moderation.InternalCuratorModerationStatsResponse
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.moderation.client.MediaServiceClient
import ru.itplanet.trampline.moderation.dao.ModerationLogDao
import ru.itplanet.trampline.moderation.dao.ModerationTaskDao
import ru.itplanet.trampline.moderation.dao.dto.ModerationLogDto
import ru.itplanet.trampline.moderation.dao.dto.ModerationTaskDto
import ru.itplanet.trampline.moderation.dao.dto.ModerationUserRefDto
import ru.itplanet.trampline.moderation.dao.query.ModerationReadModelDao
import ru.itplanet.trampline.moderation.exception.ModerationTaskNotFoundException
import ru.itplanet.trampline.moderation.model.ModerationLogAction
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus
import ru.itplanet.trampline.moderation.model.request.GetModerationTasksRequest
import ru.itplanet.trampline.moderation.model.response.ModerationDashboardResponse
import ru.itplanet.trampline.moderation.model.response.ModerationEntityHistoryItemResponse
import ru.itplanet.trampline.moderation.model.response.ModerationTaskAttachmentResponse
import ru.itplanet.trampline.moderation.model.response.ModerationTaskDetailResponse
import ru.itplanet.trampline.moderation.model.response.ModerationTaskHistoryItemResponse
import ru.itplanet.trampline.moderation.model.response.ModerationTaskListItemResponse
import ru.itplanet.trampline.moderation.model.response.ModerationTaskPageResponse
import ru.itplanet.trampline.moderation.model.response.ModerationUserShortResponse
import ru.itplanet.trampline.moderation.security.AuthenticatedUser

@Service
class ModerationQueryServiceImpl(
    private val moderationTaskDao: ModerationTaskDao,
    private val moderationLogDao: ModerationLogDao,
    private val moderationReadModelDao: ModerationReadModelDao,
    private val mediaServiceClient: MediaServiceClient,
) : ModerationQueryService {

    @Transactional(readOnly = true)
    override fun getDashboard(currentUser: AuthenticatedUser): ModerationDashboardResponse {
        val countsByEntityType = LinkedHashMap<ModerationEntityType, Long>()
        ModerationEntityType.entries.forEach { entityType ->
            countsByEntityType[entityType] = countActiveTasks(
                currentUser = currentUser,
                entityType = entityType,
            )
        }

        val countsByPriority = LinkedHashMap<ModerationTaskPriority, Long>()
        ModerationTaskPriority.entries.forEach { priority ->
            countsByPriority[priority] = countActiveTasks(
                currentUser = currentUser,
                priority = priority,
            )
        }

        return ModerationDashboardResponse(
            openCount = countTasks(
                currentUser = currentUser,
                request = GetModerationTasksRequest(status = ModerationTaskStatus.OPEN),
            ),
            inProgressCount = countTasks(
                currentUser = currentUser,
                request = GetModerationTasksRequest(status = ModerationTaskStatus.IN_PROGRESS),
            ),
            myInProgressCount = countTasks(
                currentUser = currentUser,
                request = GetModerationTasksRequest(
                    status = ModerationTaskStatus.IN_PROGRESS,
                    mine = true,
                ),
            ),
            countsByEntityType = countsByEntityType,
            countsByPriority = countsByPriority,
        )
    }

    @Transactional(readOnly = true)
    override fun getTasks(
        currentUser: AuthenticatedUser,
        request: GetModerationTasksRequest,
    ): ModerationTaskPageResponse {
        val pageable = PageRequest.of(
            request.page,
            request.size,
            parseSort(request.sort),
        )

        val specification = ModerationTaskSpecifications.build(request, currentUser.userId)
        val page = moderationTaskDao.findAll(specification, pageable)

        val taskIds = page.content.mapNotNull { it.id }
        val createdLogs = if (taskIds.isEmpty()) {
            emptyList()
        } else {
            moderationLogDao.findByTaskIdInAndActionOrderByTaskIdAscCreatedAtAscIdAsc(
                taskIds,
                ModerationLogAction.CREATED,
            )
        }

        val createdSnapshotsByTaskId = LinkedHashMap<Long, JsonNode>()
        for (log in createdLogs) {
            val taskId = log.taskId ?: continue
            createdSnapshotsByTaskId.putIfAbsent(taskId, log.payload.deepCopy())
        }

        val items = page.content.map { task ->
            val taskId = task.id ?: error("Task id must not be null")
            toListItem(
                task = task,
                createdSnapshot = createdSnapshotsByTaskId[taskId],
            )
        }

        return ModerationTaskPageResponse(
            items = items,
            page = request.page,
            size = request.size,
            totalItems = page.totalElements,
            totalPages = page.totalPages,
        )
    }

    @Transactional(readOnly = true)
    override fun getTask(
        taskId: Long,
        currentUser: AuthenticatedUser,
    ): ModerationTaskDetailResponse {
        val task = moderationTaskDao.findById(taskId)
            .orElseThrow { ModerationTaskNotFoundException(taskId) }

        ensureTaskVisible(task, currentUser)

        val history = moderationLogDao.findByTaskIdOrderByCreatedAtAscIdAsc(taskId)
        val createdSnapshot = history
            .firstOrNull { it.action == ModerationLogAction.CREATED }
            ?.payload
            ?.deepCopy()
            ?: JsonNodeFactory.instance.objectNode()

        val currentEntityState = moderationReadModelDao.findCurrentEntityState(
            task.entityType,
            task.entityId,
        )

        val attachments = moderationReadModelDao.findTaskAttachments(taskId)

        return ModerationTaskDetailResponse(
            id = task.id ?: error("Task id must not be null"),
            entityType = task.entityType,
            entityId = task.entityId,
            taskType = task.taskType,
            status = task.status,
            priority = task.priority,
            assignee = task.assigneeUser?.toResponse(),
            createdBy = task.createdByUser?.toResponse(),
            resolutionComment = task.resolutionComment,
            createdAt = task.createdAt ?: error("Task createdAt must not be null"),
            updatedAt = task.updatedAt ?: error("Task updatedAt must not be null"),
            resolvedAt = task.resolvedAt,
            createdSnapshot = createdSnapshot,
            currentEntityState = currentEntityState,
            history = history.map { it.toHistoryResponse() },
            attachments = attachments,
            availableActions = resolveAvailableActions(task, currentUser),
        )
    }

    @Transactional(readOnly = true)
    override fun getEntityAttachments(
        entityType: FileAttachmentEntityType,
        entityId: Long,
        currentUser: AuthenticatedUser,
    ): List<InternalFileAttachmentResponse> {
        ensureCanViewAttachments(currentUser)

        return mediaServiceClient.getAttachments(
            entityType = entityType,
            entityId = entityId,
        )
    }

    @Transactional(readOnly = true)
    override fun getTaskAttachmentDownloadUrl(
        taskId: Long,
        currentUser: AuthenticatedUser,
        fileId: Long,
    ): InternalFileDownloadUrlResponse {
        val task = moderationTaskDao.findById(taskId)
            .orElseThrow { ModerationTaskNotFoundException(taskId) }

        ensureTaskVisible(task, currentUser)

        val attachment = findTaskAttachmentByFileId(taskId, fileId)
        ensureCanDownloadAttachment(currentUser, attachment)

        return mediaServiceClient.getDownloadUrl(attachment.fileId)
    }

    @Transactional(readOnly = true)
    override fun getEntityHistory(
        entityType: ModerationEntityType,
        entityId: Long,
    ): List<ModerationEntityHistoryItemResponse> {
        return moderationLogDao.findByEntityTypeAndEntityIdOrderByCreatedAtAscIdAsc(entityType, entityId)
            .map { it.toEntityHistoryResponse() }
    }

    @Transactional(readOnly = true)
    override fun findActiveTaskByEntity(
        entityType: ModerationEntityType,
        entityId: Long,
        taskType: ModerationTaskType,
    ): InternalModerationTaskLookupResponse {
        val task = moderationTaskDao.findActiveByKey(
            entityType = entityType,
            entityId = entityId,
            taskType = taskType,
            statuses = ACTIVE_TASK_STATUSES,
        ).firstOrNull()

        return InternalModerationTaskLookupResponse(
            exists = task != null,
            taskId = task?.id,
        )
    }

    @Transactional(readOnly = true)
    override fun getCuratorStats(
        userId: Long,
    ): InternalCuratorModerationStatsResponse {
        val lastAction = moderationLogDao.findFirstByActorUser_IdOrderByCreatedAtDescIdDesc(userId)

        return InternalCuratorModerationStatsResponse(
            openAssignedCount = moderationTaskDao.countByStatusAndAssigneeUser_Id(
                ModerationTaskStatus.OPEN,
                userId,
            ),
            inProgressCount = moderationTaskDao.countByStatusAndAssigneeUser_Id(
                ModerationTaskStatus.IN_PROGRESS,
                userId,
            ),
            approvedCount = moderationTaskDao.countByStatusAndAssigneeUser_Id(
                ModerationTaskStatus.APPROVED,
                userId,
            ),
            rejectedCount = moderationTaskDao.countByStatusAndAssigneeUser_Id(
                ModerationTaskStatus.REJECTED,
                userId,
            ),
            cancelledCount = moderationTaskDao.countByStatusAndAssigneeUser_Id(
                ModerationTaskStatus.CANCELLED,
                userId,
            ),
            lastModerationActionAt = lastAction?.createdAt,
        )
    }

    private fun countTasks(
        currentUser: AuthenticatedUser,
        request: GetModerationTasksRequest,
    ): Long {
        return moderationTaskDao.count(
            ModerationTaskSpecifications.build(request, currentUser.userId),
        )
    }

    private fun countActiveTasks(
        currentUser: AuthenticatedUser,
        entityType: ModerationEntityType? = null,
        priority: ModerationTaskPriority? = null,
    ): Long {
        return countTasks(
            currentUser = currentUser,
            request = GetModerationTasksRequest(
                status = ModerationTaskStatus.OPEN,
                entityType = entityType,
                priority = priority,
            ),
        ) + countTasks(
            currentUser = currentUser,
            request = GetModerationTasksRequest(
                status = ModerationTaskStatus.IN_PROGRESS,
                entityType = entityType,
                priority = priority,
            ),
        )
    }

    private fun ensureTaskVisible(
        task: ModerationTaskDto,
        currentUser: AuthenticatedUser,
    ) {
        if (isOwnCreatedTagTask(task, currentUser)) {
            throw ModerationTaskNotFoundException(task.id ?: 0L)
        }
    }

    private fun isOwnCreatedTagTask(
        task: ModerationTaskDto,
        currentUser: AuthenticatedUser,
    ): Boolean {
        return task.entityType == ModerationEntityType.TAG &&
                task.createdByUser?.id == currentUser.userId
    }

    private fun findTaskAttachmentByFileId(
        taskId: Long,
        fileId: Long,
    ): ModerationTaskAttachmentResponse {
        return moderationReadModelDao.findTaskAttachments(taskId)
            .firstOrNull { attachment ->
                attachment.fileId == fileId &&
                        attachment.attachmentRole == FileAttachmentRole.ATTACHMENT.name
            }
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Moderation attachment not found")
    }

    private fun ensureCanViewAttachments(
        currentUser: AuthenticatedUser,
    ) {
        if (currentUser.role !in MODERATION_DOWNLOAD_ROLES) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied")
        }
    }

    private fun ensureCanDownloadAttachment(
        currentUser: AuthenticatedUser,
        attachment: ModerationTaskAttachmentResponse,
    ) {
        if (currentUser.role !in MODERATION_DOWNLOAD_ROLES) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied")
        }

        if (attachment.visibility != FileAssetVisibility.AUTHENTICATED.name) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only AUTHENTICATED attachments can be downloaded in moderation",
            )
        }
    }

    private fun toListItem(
        task: ModerationTaskDto,
        createdSnapshot: JsonNode?,
    ): ModerationTaskListItemResponse {
        return ModerationTaskListItemResponse(
            id = task.id ?: error("Task id must not be null"),
            entityType = task.entityType,
            entityId = task.entityId,
            taskType = task.taskType,
            status = task.status,
            priority = task.priority,
            assignee = task.assigneeUser?.toResponse(),
            createdAt = task.createdAt ?: error("Task createdAt must not be null"),
            updatedAt = task.updatedAt ?: error("Task updatedAt must not be null"),
            snapshotSummary = buildSnapshotSummary(task.entityType, createdSnapshot),
        )
    }

    private fun ModerationLogDto.toHistoryResponse(): ModerationTaskHistoryItemResponse {
        return ModerationTaskHistoryItemResponse(
            id = id ?: error("Log id must not be null"),
            action = action,
            actor = actorUser?.toResponse(),
            payload = payload.deepCopy(),
            createdAt = createdAt ?: error("Log createdAt must not be null"),
        )
    }

    private fun ModerationLogDto.toEntityHistoryResponse(): ModerationEntityHistoryItemResponse {
        return ModerationEntityHistoryItemResponse(
            id = id ?: error("Log id must not be null"),
            taskId = taskId,
            action = action,
            actor = actorUser?.toResponse(),
            payload = payload.deepCopy(),
            createdAt = createdAt ?: error("Log createdAt must not be null"),
        )
    }

    private fun ModerationUserRefDto.toResponse(): ModerationUserShortResponse {
        return ModerationUserShortResponse(
            id = id ?: error("User id must not be null"),
            displayName = displayName,
            email = email,
            role = role,
        )
    }

    private fun resolveAvailableActions(
        task: ModerationTaskDto,
        currentUser: AuthenticatedUser,
    ): List<String> {
        val assigneeId = task.assigneeUser?.id

        return when (task.status) {
            ModerationTaskStatus.OPEN -> listOf(
                "ASSIGN",
                "APPROVE",
                "REJECT",
                "COMMENT",
                "CANCEL",
            )

            ModerationTaskStatus.IN_PROGRESS -> {
                if (
                    assigneeId == null ||
                    assigneeId == currentUser.userId ||
                    currentUser.role.name == "ADMIN"
                ) {
                    listOf("APPROVE", "REJECT", "COMMENT", "CANCEL")
                } else {
                    listOf("COMMENT")
                }
            }

            ModerationTaskStatus.APPROVED,
            ModerationTaskStatus.REJECTED,
            ModerationTaskStatus.CANCELLED -> emptyList()
        }
    }

    private fun buildSnapshotSummary(
        entityType: ModerationEntityType,
        payload: JsonNode?,
    ): String? {
        if (payload == null || (payload.isObject && payload.size() == 0)) {
            return null
        }

        textValue(payload, "snapshotSummary")?.let { return it }
        textValue(payload, "summary")?.let { return it }

        val summary = when (entityType) {
            ModerationEntityType.EMPLOYER_PROFILE -> {
                val companyName = textValue(payload, "companyName")
                val inn = textValue(payload, "inn")
                listOfNotNull(companyName, inn?.let { "ИНН $it" }).joinToString(" • ")
            }

            ModerationEntityType.EMPLOYER_VERIFICATION -> {
                val method = textValue(payload, "verificationMethod")
                val corporateEmail = textValue(payload, "corporateEmail")
                val inn = textValue(payload, "inn")
                listOfNotNull(method, corporateEmail, inn?.let { "ИНН $it" }).joinToString(" • ")
            }

            ModerationEntityType.OPPORTUNITY -> {
                val title = textValue(payload, "title")
                val companyName = textValue(payload, "companyName")
                val type = textValue(payload, "type")
                listOfNotNull(title, companyName, type).joinToString(" • ")
            }

            ModerationEntityType.TAG -> {
                val name = textValue(payload, "name")
                val category = textValue(payload, "category")
                listOfNotNull(name, category).joinToString(" • ")
            }
        }.trim()

        if (summary.isNotBlank()) {
            return summary.take(300)
        }

        textValue(payload, "manualComment")?.let { return it.take(300) }

        return payload.toString().take(300)
    }

    private fun textValue(payload: JsonNode, field: String): String? {
        if (!payload.hasNonNull(field)) {
            return null
        }

        return payload.get(field)
            ?.asText()
            ?.trim()
            ?.takeIf { it.isNotBlank() }
    }

    private fun parseSort(sort: String?): Sort {
        if (sort.isNullOrBlank()) {
            return Sort.by(Sort.Order.desc("createdAt"))
        }

        val parts = sort.split(",")
            .map { it.trim() }
            .filter { it.isNotBlank() }

        val property = when (parts.firstOrNull()) {
            "createdAt" -> "createdAt"
            "updatedAt" -> "updatedAt"
            "priority" -> "priority"
            "status" -> "status"
            "entityType" -> "entityType"
            "taskType" -> "taskType"
            else -> "createdAt"
        }

        val direction = when (parts.getOrNull(1)?.uppercase()) {
            "ASC" -> Sort.Direction.ASC
            else -> Sort.Direction.DESC
        }

        return Sort.by(Sort.Order(direction, property))
    }

    companion object {
        private val ACTIVE_TASK_STATUSES = listOf(
            ModerationTaskStatus.OPEN,
            ModerationTaskStatus.IN_PROGRESS,
        )

        private val MODERATION_DOWNLOAD_ROLES = setOf(
            Role.CURATOR,
            Role.ADMIN,
        )
    }
}
