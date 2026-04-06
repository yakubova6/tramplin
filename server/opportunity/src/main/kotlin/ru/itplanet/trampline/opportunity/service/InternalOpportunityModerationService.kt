package ru.itplanet.trampline.opportunity.service

import com.fasterxml.jackson.databind.JsonNode
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.commons.model.enums.TagCategory
import ru.itplanet.trampline.commons.model.moderation.InternalModerationActionResultResponse
import ru.itplanet.trampline.commons.model.moderation.InternalModerationApproveRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRejectRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRequestChangesRequest
import ru.itplanet.trampline.opportunity.dao.OpportunityDao
import ru.itplanet.trampline.opportunity.dao.TagDao
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.exception.OpportunityConflictException
import ru.itplanet.trampline.opportunity.exception.OpportunityNotFoundDomainException
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus
import java.time.OffsetDateTime

@Service
class InternalOpportunityModerationService(
    private val opportunityDao: OpportunityDao,
    private val tagDao: TagDao,
    private val patchService: OpportunityDomainPatchService
) {

    @Transactional
    fun approveOpportunity(
        opportunityId: Long,
        request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        val opportunity = opportunityDao.findById(opportunityId).orElseThrow {
            opportunityNotFound(opportunityId)
        }

        applyOpportunityPatch(opportunityId, request.applyPatch)

        if (!request.applyPatch.has("status")) {
            opportunity.status = OpportunityStatus.PUBLISHED
        }

        if (opportunity.status == OpportunityStatus.PUBLISHED && opportunity.publishedAt == null) {
            opportunity.publishedAt = OffsetDateTime.now()
        }

        opportunity.moderationComment = request.comment

        return InternalModerationActionResultResponse(
            affectedUserId = opportunity.employerUserId,
        )
    }

    @Transactional
    fun requestChangesOpportunity(
        opportunityId: Long,
        request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse {
        val opportunity = opportunityDao.findById(opportunityId).orElseThrow {
            opportunityNotFound(opportunityId)
        }

        opportunity.status = OpportunityStatus.DRAFT
        opportunity.moderationComment = request.comment

        return InternalModerationActionResultResponse(
            affectedUserId = opportunity.employerUserId,
        )
    }

    @Transactional
    fun rejectOpportunity(
        opportunityId: Long,
        request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        val opportunity = opportunityDao.findById(opportunityId).orElseThrow {
            opportunityNotFound(opportunityId)
        }

        opportunity.status = OpportunityStatus.REJECTED
        opportunity.moderationComment = request.comment

        return InternalModerationActionResultResponse(
            affectedUserId = opportunity.employerUserId,
        )
    }

    @Transactional
    fun approveTag(
        tagId: Long,
        request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        val tag = tagDao.findById(tagId).orElseThrow {
            tagNotFound(tagId)
        }

        applyTagPatch(tag, request.applyPatch)

        val normalizedName = normalizeName(tag.name)
        ensureNoApprovedDuplicate(
            currentTagId = requireNotNull(tag.id),
            name = normalizedName,
            category = tag.category,
        )

        tag.name = normalizedName
        tag.moderationStatus = TagModerationStatus.APPROVED
        tag.isActive = true

        return InternalModerationActionResultResponse(
            affectedUserId = tag.createdByUserId,
        )
    }

    @Transactional
    fun requestChangesTag(
        tagId: Long,
        request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse {
        val tag = tagDao.findById(tagId).orElseThrow {
            tagNotFound(tagId)
        }

        return InternalModerationActionResultResponse(
            affectedUserId = tag.createdByUserId,
        )
    }

    @Transactional
    fun rejectTag(
        tagId: Long,
        request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        val tag = tagDao.findById(tagId).orElseThrow {
            tagNotFound(tagId)
        }

        tag.moderationStatus = TagModerationStatus.REJECTED
        tag.isActive = false

        return InternalModerationActionResultResponse(
            affectedUserId = tag.createdByUserId,
        )
    }

    private fun applyOpportunityPatch(
        opportunityId: Long,
        patch: JsonNode,
    ) {
        patchService.applyPatch(opportunityId, patch)
    }

    private fun applyTagPatch(
        tag: TagDto,
        patch: JsonNode,
    ) {
        if (!patch.isObject) return

        textField(patch, "name") { tag.name = it ?: tag.name }
        enumField<TagCategory>(patch, "category") { tag.category = it }

        if (patch.hasNonNull("isActive")) {
            tag.isActive = patch.get("isActive").booleanValue()
        }
    }

    private fun ensureNoApprovedDuplicate(
        currentTagId: Long,
        name: String,
        category: TagCategory,
    ) {
        val sameTags = tagDao.findAllByCategoryAndNameIgnoreCaseOrderByIdAsc(
            category = category,
            name = name,
        )

        val duplicateApproved = sameTags.firstOrNull {
            it.id != currentTagId &&
                    it.moderationStatus == TagModerationStatus.APPROVED &&
                    it.isActive
        }

        if (duplicateApproved != null) {
            throw OpportunityConflictException(
                message = "Тег с таким названием и категорией уже существует",
                code = "tag_already_exists",
            )
        }
    }

    private fun textField(
        patch: JsonNode,
        fieldName: String,
        setter: (String?) -> Unit,
    ) {
        if (!patch.has(fieldName)) return
        setter(
            patch.get(fieldName)
                .takeUnless { it.isNull }
                ?.asText()
                ?.trim()
                ?.takeIf { it.isNotEmpty() },
        )
    }

    private inline fun <reified E : Enum<E>> enumField(
        patch: JsonNode,
        fieldName: String,
        setter: (E) -> Unit,
    ) {
        if (!patch.hasNonNull(fieldName)) return
        setter(enumValueOf(patch.get(fieldName).asText().trim().uppercase()))
    }

    private fun normalizeName(
        value: String,
    ): String {
        return value.trim()
            .replace(WHITESPACE_REGEX, " ")
    }

    private fun opportunityNotFound(id: Long): OpportunityNotFoundDomainException {
        return OpportunityNotFoundDomainException(
            message = "Возможность с идентификатором $id не найдена",
            code = "opportunity_not_found",
        )
    }

    private fun tagNotFound(id: Long): OpportunityNotFoundDomainException {
        return OpportunityNotFoundDomainException(
            message = "Тег с идентификатором $id не найден",
            code = "tag_not_found",
        )
    }

    private companion object {
        private val WHITESPACE_REGEX = "\\s+".toRegex()
    }
}
