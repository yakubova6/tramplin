package ru.itplanet.trampline.opportunity.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.moderation.CreateInternalModerationTaskRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.opportunity.client.ModerationServiceClient
import ru.itplanet.trampline.opportunity.dao.TagDao
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.exception.OpportunityConflictException
import ru.itplanet.trampline.opportunity.exception.OpportunityForbiddenException
import ru.itplanet.trampline.opportunity.exception.OpportunityNotFoundDomainException
import ru.itplanet.trampline.opportunity.model.EmployerTagResponse
import ru.itplanet.trampline.opportunity.model.enums.CreatedByType
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerTagRequest
import ru.itplanet.trampline.opportunity.service.policy.EmployerOpportunityCreatePolicy

@Service
class EmployerAndCuratorAndCuratorTagServiceImpl(
    private val tagDao: TagDao,
    private val moderationServiceClient: ModerationServiceClient,
    private val objectMapper: ObjectMapper,
    private val employerOpportunityCreatePolicy: EmployerOpportunityCreatePolicy,
) : EmployerAndCuratorTagService {

    @Transactional
    override fun create(
        currentUserId: Long,
        createdByType: CreatedByType,
        request: CreateEmployerTagRequest,
    ): EmployerTagResponse {
        ensureSupportedCreatedByType(createdByType)

        if (createdByType == CreatedByType.EMPLOYER) {
            employerOpportunityCreatePolicy.checkCreateAllowed(currentUserId)
        }

        val normalizedName = normalizeName(request.name)

        val sameTags = tagDao.findAllByCategoryAndNameIgnoreCaseOrderByIdAsc(
            category = request.category,
            name = normalizedName,
        )

        val approvedTag = sameTags.firstOrNull {
            it.moderationStatus == TagModerationStatus.APPROVED && it.isActive
        }
        if (approvedTag != null) {
            throw OpportunityConflictException(
                message = "Тег с таким названием и категорией уже существует",
                code = "tag_already_exists",
            )
        }

        val foreignPendingTag = sameTags.firstOrNull {
            it.moderationStatus == TagModerationStatus.PENDING &&
                    (it.createdByType != createdByType || it.createdByUserId != currentUserId)
        }
        if (foreignPendingTag != null) {
            throw OpportunityConflictException(
                message = "Тег с таким названием и категорией уже находится на модерации",
                code = "tag_already_on_moderation",
            )
        }

        val ownTag = sameTags.firstOrNull {
            it.createdByType == createdByType && it.createdByUserId == currentUserId
        }

        if (ownTag != null) {
            when (ownTag.moderationStatus) {
                TagModerationStatus.PENDING -> {
                    ownTag.name = normalizedName
                    ownTag.category = request.category
                    ownTag.isActive = false
                }

                TagModerationStatus.REJECTED -> {
                    ownTag.name = normalizedName
                    ownTag.category = request.category
                    ownTag.moderationStatus = TagModerationStatus.PENDING
                    ownTag.isActive = false
                }

                TagModerationStatus.APPROVED -> {
                    throw OpportunityConflictException(
                        message = "Тег с таким названием и категорией уже существует",
                        code = "tag_already_exists",
                    )
                }
            }

            ensureModerationTask(
                currentUserId = currentUserId,
                createdByType = createdByType,
                tag = ownTag,
            )

            return toResponse(ownTag)
        }

        if (sameTags.isNotEmpty()) {
            throw OpportunityConflictException(
                message = "Тег с таким названием и категорией уже существует",
                code = "tag_already_exists",
            )
        }

        val saved = tagDao.save(
            TagDto().apply {
                name = normalizedName
                category = request.category
                this.createdByType = createdByType
                createdByUserId = currentUserId
                moderationStatus = TagModerationStatus.PENDING
                isActive = false
            },
        )

        ensureModerationTask(
            currentUserId = currentUserId,
            createdByType = createdByType,
            tag = saved,
        )

        return toResponse(saved)
    }

    @Transactional(readOnly = true)
    override fun getModerationTask(
        currentUserId: Long,
        createdByType: CreatedByType,
        tagId: Long,
    ): InternalModerationTaskLookupResponse {
        val tag = getOwnedTag(
            currentUserId = currentUserId,
            createdByType = createdByType,
            tagId = tagId,
        )

        return moderationServiceClient.getTaskByEntity(
            entityType = ModerationEntityType.TAG,
            entityId = requireNotNull(tag.id),
            taskType = ModerationTaskType.TAG_REVIEW,
        )
    }

    @Transactional
    override fun cancelModerationTask(
        currentUserId: Long,
        createdByType: CreatedByType,
        tagId: Long,
    ) {
        val tag = getOwnedTag(
            currentUserId = currentUserId,
            createdByType = createdByType,
            tagId = tagId,
        )

        if (tag.moderationStatus != TagModerationStatus.PENDING) {
            throw OpportunityConflictException(
                message = "Отменить задачу модерации можно только для тега со статусом PENDING",
                code = "tag_moderation_cancel_not_allowed",
            )
        }

        val taskLookup = moderationServiceClient.getTaskByEntity(
            entityType = ModerationEntityType.TAG,
            entityId = requireNotNull(tag.id),
            taskType = ModerationTaskType.TAG_REVIEW,
        )

        val taskId = taskLookup.taskId
        if (taskLookup.exists && taskId != null) {
            moderationServiceClient.cancelTask(taskId)
        }

        tag.moderationStatus = TagModerationStatus.REJECTED
        tag.isActive = false
    }

    private fun ensureModerationTask(
        currentUserId: Long,
        createdByType: CreatedByType,
        tag: TagDto,
    ) {
        moderationServiceClient.createTask(
            CreateInternalModerationTaskRequest(
                entityType = ModerationEntityType.TAG,
                entityId = requireNotNull(tag.id),
                taskType = ModerationTaskType.TAG_REVIEW,
                priority = ModerationTaskPriority.MEDIUM,
                createdByUserId = currentUserId,
                snapshot = objectMapper.valueToTree(toResponse(tag)),
                sourceService = "opportunity",
                sourceAction = sourceAction(createdByType),
            ),
        )
    }

    private fun getOwnedTag(
        currentUserId: Long,
        createdByType: CreatedByType,
        tagId: Long,
    ): TagDto {
        ensureSupportedCreatedByType(createdByType)

        val tag = tagDao.findById(tagId)
            .orElseThrow {
                OpportunityNotFoundDomainException(
                    message = "Тег не найден",
                    code = "tag_not_found",
                )
            }

        if (tag.createdByType != createdByType || tag.createdByUserId != currentUserId) {
            throw OpportunityForbiddenException(
                message = "Изменять состояние модерации может только владелец тега",
                code = "tag_owner_required",
            )
        }

        return tag
    }

    private fun toResponse(
        tag: TagDto,
    ): EmployerTagResponse {
        return EmployerTagResponse(
            id = requireNotNull(tag.id),
            name = tag.name,
            category = tag.category,
            createdByType = tag.createdByType,
            createdByUserId = tag.createdByUserId,
            moderationStatus = tag.moderationStatus,
            isActive = tag.isActive,
        )
    }

    private fun sourceAction(
        createdByType: CreatedByType,
    ): String {
        return when (createdByType) {
            CreatedByType.EMPLOYER -> "createEmployerTag"
            CreatedByType.CURATOR -> "createCuratorTag"
            CreatedByType.ADMIN -> "createAdminTag"
            CreatedByType.SYSTEM -> "createSystemTag"
        }
    }

    private fun ensureSupportedCreatedByType(
        createdByType: CreatedByType,
    ) {
        if (createdByType == CreatedByType.SYSTEM) {
            throw OpportunityForbiddenException(
                message = "Теги, созданные системой, нельзя изменять через публичный API",
                code = "system_tag_management_forbidden",
            )
        }
    }

    private fun normalizeName(
        value: String,
    ): String {
        return value.trim()
            .replace(WHITESPACE_REGEX, " ")
    }

    private companion object {
        private val WHITESPACE_REGEX = "\\s+".toRegex()
    }
}
