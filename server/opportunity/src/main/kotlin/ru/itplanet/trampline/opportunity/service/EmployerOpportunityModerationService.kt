package ru.itplanet.trampline.opportunity.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.commons.model.moderation.CreateInternalModerationTaskRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.opportunity.client.ModerationServiceClient
import ru.itplanet.trampline.opportunity.converter.EmployerOpportunityConverter
import ru.itplanet.trampline.opportunity.dao.OpportunityDao
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
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
        )

        return employerOpportunityConverter.toCard(opportunity)
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
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "Only pending moderation opportunity can cancel moderation task",
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
        opportunity.moderationComment = "Cancelled by employer"
    }

    private fun ensureModerationTask(
        employerUserId: Long,
        opportunity: OpportunityDto,
    ) {
        moderationServiceClient.createTask(
            CreateInternalModerationTaskRequest(
                entityType = ModerationEntityType.OPPORTUNITY,
                entityId = requireNotNull(opportunity.id),
                taskType = ModerationTaskType.OPPORTUNITY_REVIEW,
                priority = ModerationTaskPriority.MEDIUM,
                createdByUserId = employerUserId,
                snapshot = objectMapper.valueToTree(
                    employerOpportunityConverter.toEditPayload(opportunity),
                ),
                sourceService = "opportunity",
                sourceAction = "createEmployerOpportunity",
            ),
        )
    }

    private fun getOwnedOpportunity(
        employerUserId: Long,
        opportunityId: Long,
    ): OpportunityDto {
        val opportunity = opportunityDao.findById(opportunityId)
            .orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "Opportunity not found")
            }

        if (opportunity.employerUserId != employerUserId) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only opportunity owner can manage moderation state",
            )
        }

        return opportunity
    }
}
