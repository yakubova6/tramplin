package ru.itplanet.trampline.opportunity.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ObjectNode
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.moderation.CreateInternalModerationTaskRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.opportunity.client.ModerationServiceClient
import ru.itplanet.trampline.opportunity.converter.EmployerOpportunityConverter
import ru.itplanet.trampline.opportunity.dao.OpportunityDao
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.exception.OpportunityConflictException
import ru.itplanet.trampline.opportunity.exception.OpportunityForbiddenException
import ru.itplanet.trampline.opportunity.exception.OpportunityNotFoundDomainException
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityCard
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerOpportunityRequest

@Service
class EmployerOpportunityModerationService(
    private val employerOpportunityService: EmployerOpportunityService,
    private val opportunityDao: OpportunityDao,
    private val employerOpportunityConverter: EmployerOpportunityConverter,
    private val moderationServiceClient: ModerationServiceClient,
    private val objectMapper: ObjectMapper,
) {

    @Transactional
    fun create(
        employerUserId: Long,
        request: CreateEmployerOpportunityRequest,
    ): EmployerOpportunityCard {
        val created = employerOpportunityService.create(employerUserId, request)
        val opportunity = getOwnedOpportunity(employerUserId, created.id)

        if (opportunity.status == OpportunityStatus.DRAFT) {
            opportunity.status = OpportunityStatus.PENDING_MODERATION
            opportunity.publishedAt = null
        }

        ensureModerationTask(
            employerUserId = employerUserId,
            opportunity = opportunity,
            sourceAction = "createEmployerOpportunity",
            mediaAttachments = emptyList(),
        )

        return employerOpportunityConverter.toCard(opportunity)
    }

    @Transactional
    fun update(
        employerUserId: Long,
        opportunityId: Long,
        request: CreateEmployerOpportunityRequest,
    ): EmployerOpportunityCard {
        val updated = employerOpportunityService.update(employerUserId, opportunityId, request)
        val opportunity = getOwnedOpportunity(employerUserId, updated.id)

        if (opportunity.status == OpportunityStatus.DRAFT || opportunity.status == OpportunityStatus.REJECTED) {
            opportunity.status = OpportunityStatus.PENDING_MODERATION
            opportunity.publishedAt = null
        }

        ensureModerationTask(
            employerUserId = employerUserId,
            opportunity = opportunity,
            sourceAction = "updateEmployerOpportunity",
            mediaAttachments = emptyList(),
        )

        return employerOpportunityConverter.toCard(opportunity)
    }

    @Transactional
    fun submitAfterMediaChanged(
        employerUserId: Long,
        opportunityId: Long,
        mediaAttachments: List<InternalFileAttachmentResponse>,
        sourceAction: String,
    ) {
        val opportunity = getOwnedOpportunity(employerUserId, opportunityId)

        if (opportunity.status != OpportunityStatus.PUBLISHED) {
            throw OpportunityConflictException(
                message = "Повторно отправить на модерацию после изменения медиа можно только опубликованную возможность",
                code = "opportunity_resubmit_not_allowed",
            )
        }

        opportunity.status = OpportunityStatus.PENDING_MODERATION
        opportunity.publishedAt = null
        opportunity.moderationComment = null

        ensureModerationTask(
            employerUserId = employerUserId,
            opportunity = opportunity,
            sourceAction = sourceAction,
            mediaAttachments = mediaAttachments,
        )
    }

    @Transactional(readOnly = true)
    fun getModerationTask(
        employerUserId: Long,
        opportunityId: Long,
    ): InternalModerationTaskLookupResponse {
        val opportunity = getOwnedOpportunity(employerUserId, opportunityId)

        return moderationServiceClient.getTaskByEntity(
            entityType = ModerationEntityType.OPPORTUNITY,
            entityId = requireNotNull(opportunity.id),
            taskType = ModerationTaskType.OPPORTUNITY_REVIEW,
        )
    }

    @Transactional
    fun cancelModerationTask(
        employerUserId: Long,
        opportunityId: Long,
    ) {
        val opportunity = getOwnedOpportunity(employerUserId, opportunityId)

        if (opportunity.status != OpportunityStatus.PENDING_MODERATION) {
            throw OpportunityConflictException(
                message = "Отменить задачу модерации можно только для возможности со статусом PENDING_MODERATION",
                code = "opportunity_moderation_cancel_not_allowed",
            )
        }

        val taskLookup = moderationServiceClient.getTaskByEntity(
            entityType = ModerationEntityType.OPPORTUNITY,
            entityId = requireNotNull(opportunity.id),
            taskType = ModerationTaskType.OPPORTUNITY_REVIEW,
        )

        val taskId = taskLookup.taskId
        if (taskLookup.exists && taskId != null) {
            moderationServiceClient.cancelTask(taskId)
        }

        opportunity.status = OpportunityStatus.REJECTED
        opportunity.publishedAt = null
        opportunity.moderationComment = "Модерация отменена работодателем"
    }

    private fun ensureModerationTask(
        employerUserId: Long,
        opportunity: OpportunityDto,
        sourceAction: String,
        mediaAttachments: List<InternalFileAttachmentResponse>,
    ) {
        moderationServiceClient.createTask(
            CreateInternalModerationTaskRequest(
                entityType = ModerationEntityType.OPPORTUNITY,
                entityId = requireNotNull(opportunity.id),
                taskType = ModerationTaskType.OPPORTUNITY_REVIEW,
                priority = ModerationTaskPriority.MEDIUM,
                createdByUserId = employerUserId,
                snapshot = buildOpportunitySnapshot(opportunity, mediaAttachments),
                sourceService = "opportunity",
                sourceAction = sourceAction,
            ),
        )
    }

    private fun buildOpportunitySnapshot(
        opportunity: OpportunityDto,
        mediaAttachments: List<InternalFileAttachmentResponse>,
    ): ObjectNode {
        val snapshot = objectMapper.valueToTree<ObjectNode>(
            employerOpportunityConverter.toEditPayload(opportunity),
        )

        val mediaArray = snapshot.putArray("mediaAttachments")
        mediaAttachments
            .sortedWith(compareBy<InternalFileAttachmentResponse>({ it.sortOrder }, { it.attachmentId }))
            .forEach { attachment ->
                mediaArray.addObject().apply {
                    put("attachmentId", attachment.attachmentId)
                    put("fileId", attachment.fileId)
                    put("attachmentRole", attachment.attachmentRole.name)
                    put("sortOrder", attachment.sortOrder)
                    put("originalFileName", attachment.file.originalFileName)
                    put("mediaType", attachment.file.mediaType)
                    put("sizeBytes", attachment.file.sizeBytes)
                    put("kind", attachment.file.kind.name)
                    put("visibility", attachment.file.visibility.name)
                    put("status", attachment.file.status.name)
                    attachment.file.createdAt?.let { put("createdAt", it.toString()) }
                    attachment.file.updatedAt?.let { put("updatedAt", it.toString()) }
                }
            }

        return snapshot
    }

    private fun getOwnedOpportunity(
        employerUserId: Long,
        opportunityId: Long,
    ): OpportunityDto {
        val opportunity = opportunityDao.findById(opportunityId)
            .orElseThrow {
                OpportunityNotFoundDomainException(
                    message = "Возможность не найдена",
                    code = "opportunity_not_found",
                )
            }

        if (opportunity.employerUserId != employerUserId) {
            throw OpportunityForbiddenException(
                message = "Изменять состояние модерации может только владелец возможности",
                code = "opportunity_owner_required",
            )
        }

        return opportunity
    }
}
