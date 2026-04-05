package ru.itplanet.trampline.opportunity.service

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.dao.CityDao
import ru.itplanet.trampline.commons.dao.LocationDao
import ru.itplanet.trampline.commons.model.OpportunityContactInfo
import ru.itplanet.trampline.commons.model.enums.EmploymentType
import ru.itplanet.trampline.commons.model.enums.Grade
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.ResourceLinkType
import ru.itplanet.trampline.commons.model.enums.TagCategory
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import ru.itplanet.trampline.commons.model.moderation.InternalModerationActionResultResponse
import ru.itplanet.trampline.commons.model.moderation.InternalModerationApproveRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRejectRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRequestChangesRequest
import ru.itplanet.trampline.opportunity.dao.OpportunityDao
import ru.itplanet.trampline.opportunity.dao.TagDao
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityResourceLinkDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityResourceLinkId
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.exception.OpportunityConflictException
import ru.itplanet.trampline.opportunity.exception.OpportunityNotFoundDomainException
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus
import java.time.LocalDate
import java.time.OffsetDateTime

@Service
class InternalOpportunityModerationService(
    private val opportunityDao: OpportunityDao,
    private val tagDao: TagDao,
    private val cityDao: CityDao,
    private val locationDao: LocationDao,
    private val objectMapper: ObjectMapper,
) {

    @Transactional
    fun approveOpportunity(
        opportunityId: Long,
        request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        val opportunity = opportunityDao.findById(opportunityId).orElseThrow {
            opportunityNotFound(opportunityId)
        }

        applyOpportunityPatch(opportunity, request.applyPatch)

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
        opportunity: OpportunityDto,
        patch: JsonNode,
    ) {
        if (!patch.isObject) return

        textField(patch, "title") { opportunity.title = it ?: opportunity.title }
        textField(patch, "shortDescription") { opportunity.shortDescription = it ?: opportunity.shortDescription }
        textField(patch, "fullDescription") { opportunity.fullDescription = it }
        textField(patch, "requirements") { opportunity.requirements = it }
        textField(patch, "companyName") { opportunity.companyName = it ?: opportunity.companyName }
        textField(patch, "salaryCurrency") { opportunity.salaryCurrency = it ?: opportunity.salaryCurrency }
        textField(patch, "moderationComment") { opportunity.moderationComment = it }

        enumField<OpportunityType>(patch, "type") { opportunity.type = it }
        enumField<WorkFormat>(patch, "workFormat") { opportunity.workFormat = it }
        nullableEnumField<EmploymentType>(patch, "employmentType") { opportunity.employmentType = it }
        nullableEnumField<Grade>(patch, "grade") { opportunity.grade = it }
        enumField<OpportunityStatus>(patch, "status") { opportunity.status = it }

        intField(patch, "salaryFrom") { opportunity.salaryFrom = it }
        intField(patch, "salaryTo") { opportunity.salaryTo = it }

        if (patch.has("publishedAt")) {
            opportunity.publishedAt = patch.get("publishedAt")
                .takeUnless { it.isNull }
                ?.asText()
                ?.let(OffsetDateTime::parse)
        }

        if (patch.has("expiresAt")) {
            opportunity.expiresAt = patch.get("expiresAt")
                .takeUnless { it.isNull }
                ?.asText()
                ?.let(OffsetDateTime::parse)
        }

        if (patch.has("eventDate")) {
            opportunity.eventDate = patch.get("eventDate")
                .takeUnless { it.isNull }
                ?.asText()
                ?.let(LocalDate::parse)
        }

        if (patch.has("cityId")) {
            opportunity.cityId = patch.get("cityId")
                .takeUnless { it.isNull }
                ?.longValue()

            opportunity.city = opportunity.cityId?.let { cityId ->
                cityDao.findById(cityId).orElseThrow {
                    OpportunityNotFoundDomainException(
                        message = "Город не найден",
                        code = "city_not_found",
                    )
                }
            }
        }

        if (patch.has("locationId")) {
            opportunity.locationId = patch.get("locationId")
                .takeUnless { it.isNull }
                ?.longValue()

            opportunity.location = opportunity.locationId?.let { locationId ->
                locationDao.findById(locationId).orElseThrow {
                    OpportunityNotFoundDomainException(
                        message = "Локация не найдена",
                        code = "location_not_found",
                    )
                }
            }
        }

        if (patch.has("contactInfo")) {
            opportunity.contactInfo = patch.get("contactInfo")
                .takeUnless { it.isNull }
                ?.let { objectMapper.treeToValue(it, OpportunityContactInfo::class.java) }
                ?: OpportunityContactInfo()
        }

        if (patch.has("resourceLinks")) {
            replaceResourceLinks(opportunity, patch.get("resourceLinks"))
        }

        if (patch.has("tagIds")) {
            replaceTags(opportunity, patch.get("tagIds"))
        }
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

    private fun replaceResourceLinks(
        opportunity: OpportunityDto,
        node: JsonNode,
    ) {
        opportunity.resourceLinks.clear()

        if (node.isNull) {
            return
        }

        val items = objectMapper.convertValue(node, object : TypeReference<List<ResourceLinkPatch>>() {})
        items.forEachIndexed { index, item ->
            opportunity.resourceLinks.add(
                OpportunityResourceLinkDto().apply {
                    id = OpportunityResourceLinkId(
                        opportunityId = opportunity.id ?: 0L,
                        sortOrder = index,
                    )
                    this.opportunity = opportunity
                    this.label = item.label
                    this.linkType = item.linkType
                    this.url = item.url
                },
            )
        }
    }

    private fun replaceTags(
        opportunity: OpportunityDto,
        node: JsonNode,
    ) {
        opportunity.tags.clear()

        if (node.isNull) {
            return
        }

        val tagIds = objectMapper.convertValue(node, object : TypeReference<List<Long>>() {})
        if (tagIds.isEmpty()) {
            return
        }

        val tagsById = tagDao.findAllById(tagIds).associateBy { it.id!! }
        val missingIds = tagIds.filterNot(tagsById::containsKey)
        if (missingIds.isNotEmpty()) {
            throw OpportunityNotFoundDomainException(
                message = "Не найдены теги: $missingIds",
                code = "tags_not_found",
            )
        }

        val orderedTags = linkedSetOf<TagDto>()
        tagIds.forEach { tagId ->
            orderedTags += tagsById.getValue(tagId)
        }
        opportunity.tags = orderedTags
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

    private fun intField(
        patch: JsonNode,
        fieldName: String,
        setter: (Int?) -> Unit,
    ) {
        if (!patch.has(fieldName)) return
        setter(
            patch.get(fieldName)
                .takeUnless { it.isNull }
                ?.intValue(),
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

    private inline fun <reified E : Enum<E>> nullableEnumField(
        patch: JsonNode,
        fieldName: String,
        setter: (E?) -> Unit,
    ) {
        if (!patch.has(fieldName)) return
        setter(
            patch.get(fieldName)
                .takeUnless { it.isNull }
                ?.asText()
                ?.trim()
                ?.uppercase()
                ?.let { enumValueOf<E>(it) },
        )
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

    private data class ResourceLinkPatch(
        val label: String,
        val linkType: ResourceLinkType,
        val url: String,
    )

    private companion object {
        private val WHITESPACE_REGEX = "\\s+".toRegex()
    }
}
