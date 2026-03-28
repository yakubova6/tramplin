package ru.itplanet.trampline.opportunity.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.model.moderation.CreateInternalModerationTaskRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.opportunity.client.ModerationServiceClient
import ru.itplanet.trampline.opportunity.dao.TagDao
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.model.EmployerTagResponse
import ru.itplanet.trampline.opportunity.model.enums.CreatedByType
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerTagRequest

@Service
class EmployerTagServiceImpl(
    private val tagDao: TagDao,
    private val moderationServiceClient: ModerationServiceClient,
    private val objectMapper: ObjectMapper,
) : EmployerTagService {

    @Transactional
    override fun create(
        employerUserId: Long,
        request: CreateEmployerTagRequest,
    ): EmployerTagResponse {
        val normalizedName = normalizeName(request.name)

        val sameTags = tagDao.findAllByCategoryAndNameIgnoreCaseOrderByIdAsc(
            category = request.category,
            name = normalizedName,
        )

        val approvedTag = sameTags.firstOrNull {
            it.moderationStatus == TagModerationStatus.APPROVED && it.isActive
        }
        if (approvedTag != null) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "Tag with same name and category already exists",
            )
        }

        val foreignPendingTag = sameTags.firstOrNull {
            it.moderationStatus == TagModerationStatus.PENDING &&
                    (it.createdByType != CreatedByType.EMPLOYER || it.createdByUserId != employerUserId)
        }
        if (foreignPendingTag != null) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "Tag with same name and category is already under review",
            )
        }

        val ownTag = sameTags.firstOrNull {
            it.createdByType == CreatedByType.EMPLOYER && it.createdByUserId == employerUserId
        }

        if (ownTag != null) {
            when (ownTag.moderationStatus) {
                TagModerationStatus.PENDING -> {
                    ownTag.isActive = false
                }

                TagModerationStatus.REJECTED -> {
                    ownTag.moderationStatus = TagModerationStatus.PENDING
                    ownTag.isActive = false
                }

                TagModerationStatus.APPROVED -> {
                    throw ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Tag with same name and category already exists",
                    )
                }
            }

            ensureModerationTask(
                employerUserId = employerUserId,
                tag = ownTag,
            )

            return toResponse(ownTag)
        }

        if (sameTags.isNotEmpty()) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "Tag with same name and category already exists",
            )
        }

        val saved = tagDao.save(
            TagDto().apply {
                name = normalizedName
                category = request.category
                createdByType = CreatedByType.EMPLOYER
                createdByUserId = employerUserId
                moderationStatus = TagModerationStatus.PENDING
                isActive = false
            },
        )

        ensureModerationTask(
            employerUserId = employerUserId,
            tag = saved,
        )

        return toResponse(saved)
    }

    @Transactional(readOnly = true)
    override fun getModerationTask(
        employerUserId: Long,
        tagId: Long,
    ): InternalModerationTaskLookupResponse {
        val tag = getOwnedTag(employerUserId, tagId)

        return moderationServiceClient.getTaskByEntity(
            entityType = ModerationEntityType.TAG,
            entityId = requireNotNull(tag.id),
            taskType = ModerationTaskType.TAG_REVIEW,
        )
    }

    @Transactional
    override fun cancelModerationTask(
        employerUserId: Long,
        tagId: Long,
    ) {
        val tag = getOwnedTag(employerUserId, tagId)

        if (tag.moderationStatus != TagModerationStatus.PENDING) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "Only pending tag can cancel moderation task",
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
        employerUserId: Long,
        tag: TagDto,
    ) {
        moderationServiceClient.createTask(
            CreateInternalModerationTaskRequest(
                entityType = ModerationEntityType.TAG,
                entityId = requireNotNull(tag.id),
                taskType = ModerationTaskType.TAG_REVIEW,
                priority = ModerationTaskPriority.MEDIUM,
                createdByUserId = employerUserId,
                snapshot = objectMapper.valueToTree(toResponse(tag)),
                sourceService = "opportunity",
                sourceAction = "createEmployerTag",
            ),
        )
    }

    private fun getOwnedTag(
        employerUserId: Long,
        tagId: Long,
    ): TagDto {
        val tag = tagDao.findById(tagId)
            .orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "Tag not found")
            }

        if (tag.createdByType != CreatedByType.EMPLOYER || tag.createdByUserId != employerUserId) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only employer-created tag owner can manage moderation state",
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
