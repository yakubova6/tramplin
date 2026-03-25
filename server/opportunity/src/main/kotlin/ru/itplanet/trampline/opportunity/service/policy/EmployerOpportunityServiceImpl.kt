package ru.itplanet.trampline.opportunity.service

import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.exception.OpportunityNotFoundException
import ru.itplanet.trampline.commons.exception.OpportunityValidationException
import ru.itplanet.trampline.opportunity.converter.EmployerOpportunityConverter
import ru.itplanet.trampline.opportunity.dao.CityDao
import ru.itplanet.trampline.opportunity.dao.LocationDao
import ru.itplanet.trampline.opportunity.dao.OpportunityDao
import ru.itplanet.trampline.opportunity.dao.TagDao
import ru.itplanet.trampline.opportunity.dao.dto.CityDto
import ru.itplanet.trampline.opportunity.dao.dto.LocationDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityResourceLinkDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityResourceLinkId
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.dao.specification.EmployerOpportunitySpecification
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityCard
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityEditPayload
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityListItem
import ru.itplanet.trampline.opportunity.model.OpportunityContactInfo
import ru.itplanet.trampline.opportunity.model.OpportunityPage
import ru.itplanet.trampline.opportunity.model.enums.OpportunityStatus
import ru.itplanet.trampline.opportunity.model.enums.OpportunityType
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus
import ru.itplanet.trampline.opportunity.model.enums.WorkFormat
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerOpportunityContactInfoRequest
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerOpportunityRequest
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerOpportunityResourceLinkRequest
import ru.itplanet.trampline.opportunity.model.request.GetEmployerOpportunityListRequest
import ru.itplanet.trampline.opportunity.service.policy.EmployerOpportunityCreatePolicy
import ru.itplanet.trampline.opportunity.util.OffsetBasedPageRequest
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Locale

@Service
class EmployerOpportunityServiceImpl(
    private val opportunityDao: OpportunityDao,
    private val tagDao: TagDao,
    private val cityDao: CityDao,
    private val locationDao: LocationDao,
    private val employerOpportunityConverter: EmployerOpportunityConverter,
    private val employerOpportunityCreatePolicy: EmployerOpportunityCreatePolicy
) : EmployerOpportunityService {

    @Transactional
    override fun create(
        currentUserId: Long,
        request: CreateEmployerOpportunityRequest
    ): EmployerOpportunityCard {
        employerOpportunityCreatePolicy.checkCreateAllowed(currentUserId)

        validateSalary(request)
        validateTemporalFields(request)

        val resolvedTags = resolveTags(request.tagIds.distinct())
        val resolvedPlace = resolvePlace(request)

        val opportunity = OpportunityDto().apply {
            employerUserId = currentUserId
            status = OpportunityStatus.DRAFT
            publishedAt = null
            moderationComment = null
        }

        applyEditableFieldsOnCreate(
            opportunity = opportunity,
            request = request,
            resolvedTags = resolvedTags,
            resolvedPlace = resolvedPlace
        )

        val saved = opportunityDao.saveAndFlush(opportunity)
        return employerOpportunityConverter.toCard(saved)
    }

    @Transactional(readOnly = true)
    override fun getMyOpportunities(
        currentUserId: Long,
        request: GetEmployerOpportunityListRequest
    ): OpportunityPage<EmployerOpportunityListItem> {
        val pageable = OffsetBasedPageRequest(
            limit = request.limit,
            offset = request.offset,
            sort = Sort.by(request.sortDirection.toSpring(), request.sortBy.property)
        )

        val page = opportunityDao.findAll(
            EmployerOpportunitySpecification.build(currentUserId, request),
            pageable
        )

        return OpportunityPage(
            items = page.content.map(employerOpportunityConverter::toListItem),
            limit = request.limit,
            offset = request.offset,
            total = page.totalElements
        )
    }

    @Transactional(readOnly = true)
    override fun getMyOpportunity(
        currentUserId: Long,
        opportunityId: Long
    ): EmployerOpportunityEditPayload {
        val opportunity = getOwnedOpportunity(opportunityId, currentUserId)
        return employerOpportunityConverter.toEditPayload(opportunity)
    }

    @Transactional
    override fun update(
        currentUserId: Long,
        opportunityId: Long,
        request: CreateEmployerOpportunityRequest
    ): EmployerOpportunityEditPayload {
        val opportunity = getOwnedOpportunity(opportunityId, currentUserId)

        validateEditableStatus(opportunity.status)
        validateSalary(request)
        validateTemporalFields(request)

        val resolvedTags = resolveTags(request.tagIds.distinct())
        val resolvedPlace = resolvePlace(request)

        applyEditableFieldsOnUpdate(
            opportunity = opportunity,
            request = request,
            resolvedTags = resolvedTags,
            resolvedPlace = resolvedPlace
        )

        opportunity.status = OpportunityStatus.DRAFT
        opportunity.publishedAt = null
        opportunity.moderationComment = null

        val saved = opportunityDao.saveAndFlush(opportunity)
        return employerOpportunityConverter.toEditPayload(saved)
    }

    @Transactional
    override fun returnToDraft(
        currentUserId: Long,
        opportunityId: Long
    ): EmployerOpportunityEditPayload {
        val opportunity = getOwnedOpportunity(opportunityId, currentUserId)

        validateReturnToDraftAllowed(opportunity.status)

        opportunity.status = OpportunityStatus.DRAFT
        opportunity.publishedAt = null
        opportunity.moderationComment = null

        val saved = opportunityDao.saveAndFlush(opportunity)
        return employerOpportunityConverter.toEditPayload(saved)
    }

    @Transactional
    override fun close(
        currentUserId: Long,
        opportunityId: Long
    ): EmployerOpportunityEditPayload {
        val opportunity = getOwnedOpportunity(opportunityId, currentUserId)

        validateCloseAllowed(opportunity.status)

        opportunity.status = OpportunityStatus.CLOSED

        val saved = opportunityDao.saveAndFlush(opportunity)
        return employerOpportunityConverter.toEditPayload(saved)
    }

    @Transactional
    override fun archive(
        currentUserId: Long,
        opportunityId: Long
    ): EmployerOpportunityEditPayload {
        val opportunity = getOwnedOpportunity(opportunityId, currentUserId)

        validateArchiveAllowed(opportunity.status)

        opportunity.status = OpportunityStatus.ARCHIVED

        val saved = opportunityDao.saveAndFlush(opportunity)
        return employerOpportunityConverter.toEditPayload(saved)
    }

    private fun getOwnedOpportunity(
        opportunityId: Long,
        currentUserId: Long
    ): OpportunityDto {
        return opportunityDao.findByIdAndEmployerUserId(opportunityId, currentUserId)
            .orElseThrow { OpportunityNotFoundException(opportunityId) }
    }

    private fun validateEditableStatus(status: OpportunityStatus) {
        if (status == OpportunityStatus.DRAFT || status == OpportunityStatus.REJECTED) {
            return
        }

        throw OpportunityValidationException(
            message = "Opportunity cannot be edited in current status",
            details = mapOf(
                "status" to status.name,
                "allowedStatuses" to "DRAFT,REJECTED"
            )
        )
    }

    private fun validateReturnToDraftAllowed(status: OpportunityStatus) {
        when (status) {
            OpportunityStatus.REJECTED,
            OpportunityStatus.PENDING_MODERATION,
            OpportunityStatus.PLANNED,
            OpportunityStatus.CLOSED,
            OpportunityStatus.ARCHIVED -> return

            OpportunityStatus.DRAFT -> throw OpportunityValidationException(
                message = "Opportunity is already in DRAFT status",
                details = mapOf("status" to status.name)
            )

            OpportunityStatus.PUBLISHED -> throw OpportunityValidationException(
                message = "PUBLISHED opportunity cannot be returned to DRAFT by this action",
                details = mapOf("status" to status.name)
            )
        }
    }

    private fun validateCloseAllowed(status: OpportunityStatus) {
        when (status) {
            OpportunityStatus.PUBLISHED -> return

            OpportunityStatus.CLOSED -> throw OpportunityValidationException(
                message = "Opportunity is already CLOSED",
                details = mapOf("status" to status.name)
            )

            OpportunityStatus.ARCHIVED -> throw OpportunityValidationException(
                message = "ARCHIVED opportunity cannot be closed",
                details = mapOf("status" to status.name)
            )

            else -> throw OpportunityValidationException(
                message = "Opportunity cannot be closed in current status",
                details = mapOf(
                    "status" to status.name,
                    "allowedStatuses" to "PUBLISHED"
                )
            )
        }
    }

    private fun validateArchiveAllowed(status: OpportunityStatus) {
        when (status) {
            OpportunityStatus.CLOSED,
            OpportunityStatus.REJECTED -> return

            OpportunityStatus.ARCHIVED -> throw OpportunityValidationException(
                message = "Opportunity is already ARCHIVED",
                details = mapOf("status" to status.name)
            )

            OpportunityStatus.PUBLISHED -> throw OpportunityValidationException(
                message = "PUBLISHED opportunity must be closed before archiving",
                details = mapOf("status" to status.name)
            )

            else -> throw OpportunityValidationException(
                message = "Opportunity cannot be archived in current status",
                details = mapOf(
                    "status" to status.name,
                    "allowedStatuses" to "CLOSED,REJECTED"
                )
            )
        }
    }

    private fun applyEditableFieldsOnCreate(
        opportunity: OpportunityDto,
        request: CreateEmployerOpportunityRequest,
        resolvedTags: List<TagDto>,
        resolvedPlace: ResolvedPlace
    ) {
        applyBaseEditableFields(
            opportunity = opportunity,
            request = request,
            resolvedTags = resolvedTags,
            resolvedPlace = resolvedPlace
        )

        opportunity.resourceLinks = buildResourceLinks(opportunity, request)
    }

    private fun applyEditableFieldsOnUpdate(
        opportunity: OpportunityDto,
        request: CreateEmployerOpportunityRequest,
        resolvedTags: List<TagDto>,
        resolvedPlace: ResolvedPlace
    ) {
        applyBaseEditableFields(
            opportunity = opportunity,
            request = request,
            resolvedTags = resolvedTags,
            resolvedPlace = resolvedPlace
        )

        syncResourceLinks(opportunity, request.resourceLinks)
    }

    private fun applyBaseEditableFields(
        opportunity: OpportunityDto,
        request: CreateEmployerOpportunityRequest,
        resolvedTags: List<TagDto>,
        resolvedPlace: ResolvedPlace
    ) {
        opportunity.title = request.title.trim()
        opportunity.shortDescription = request.shortDescription.trim()
        opportunity.fullDescription = request.fullDescription.normalizeNullableText()
        opportunity.requirements = request.requirements.normalizeNullableText()
        opportunity.companyName = request.companyName.trim()
        opportunity.type = request.type
        opportunity.workFormat = request.workFormat
        opportunity.employmentType = request.employmentType
        opportunity.grade = request.grade
        opportunity.salaryFrom = request.salaryFrom
        opportunity.salaryTo = request.salaryTo
        opportunity.salaryCurrency = request.salaryCurrency.trim().uppercase(Locale.ROOT)
        opportunity.expiresAt = request.expiresAt
        opportunity.eventDate = request.eventDate
        opportunity.cityId = requireNotNull(resolvedPlace.city.id)
        opportunity.city = resolvedPlace.city
        opportunity.locationId = resolvedPlace.location?.id
        opportunity.location = resolvedPlace.location
        opportunity.contactInfo = request.contactInfo.toModel()

        opportunity.tags.clear()
        opportunity.tags.addAll(resolvedTags)
    }

    private fun syncResourceLinks(
        opportunity: OpportunityDto,
        requestedLinks: List<CreateEmployerOpportunityResourceLinkRequest>
    ) {
        val existingLinks = opportunity.resourceLinks
            .sortedBy { it.id.sortOrder }
            .toMutableList()

        requestedLinks.forEachIndexed { index, requestLink ->
            val existing = existingLinks.getOrNull(index)

            if (existing != null) {
                existing.label = requestLink.label.trim()
                existing.linkType = requestLink.linkType
                existing.url = requestLink.url.trim()
            } else {
                opportunity.resourceLinks.add(
                    OpportunityResourceLinkDto().apply {
                        id = OpportunityResourceLinkId(sortOrder = index)
                        this.opportunity = opportunity
                        label = requestLink.label.trim()
                        linkType = requestLink.linkType
                        url = requestLink.url.trim()
                    }
                )
            }
        }

        while (opportunity.resourceLinks.size > requestedLinks.size) {
            opportunity.resourceLinks.removeAt(opportunity.resourceLinks.lastIndex)
        }
    }

    private fun validateSalary(request: CreateEmployerOpportunityRequest) {
        val salaryFrom = request.salaryFrom
        val salaryTo = request.salaryTo

        if (salaryFrom != null && salaryTo != null && salaryFrom > salaryTo) {
            throw OpportunityValidationException(
                message = "salaryFrom must be less than or equal to salaryTo",
                details = mapOf(
                    "salaryFrom" to salaryFrom.toString(),
                    "salaryTo" to salaryTo.toString()
                )
            )
        }
    }

    private fun validateTemporalFields(request: CreateEmployerOpportunityRequest) {
        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val today = now.toLocalDate()

        if (request.type == OpportunityType.EVENT) {
            if (request.eventDate == null) {
                throw OpportunityValidationException(
                    message = "EVENT requires eventDate",
                    details = mapOf("eventDate" to "must not be null for EVENT")
                )
            }

            if (request.expiresAt != null) {
                throw OpportunityValidationException(
                    message = "EVENT must not contain expiresAt",
                    details = mapOf("expiresAt" to "must be null for EVENT")
                )
            }

            if (request.eventDate.isBefore(today)) {
                throw OpportunityValidationException(
                    message = "eventDate must not be in the past",
                    details = mapOf("eventDate" to request.eventDate.toString())
                )
            }
        } else {
            if (request.eventDate != null) {
                throw OpportunityValidationException(
                    message = "Only EVENT can contain eventDate",
                    details = mapOf("eventDate" to "must be null for non-EVENT opportunity")
                )
            }

            if (request.expiresAt != null && request.expiresAt.isBefore(now)) {
                throw OpportunityValidationException(
                    message = "expiresAt must not be in the past",
                    details = mapOf("expiresAt" to request.expiresAt.toString())
                )
            }
        }
    }

    private fun resolveTags(tagIds: List<Long>): List<TagDto> {
        if (tagIds.isEmpty()) {
            return emptyList()
        }

        val tags = tagDao.findAllById(tagIds)
        val tagsById = tags.associateBy { requireNotNull(it.id) }

        val missingIds = tagIds.filterNot(tagsById::containsKey)
        if (missingIds.isNotEmpty()) {
            throw OpportunityValidationException(
                message = "Some tagIds do not exist",
                details = mapOf("tagIds" to missingIds.joinToString(","))
            )
        }

        val invalidIds = tags
            .filter { !it.isActive || it.moderationStatus != TagModerationStatus.APPROVED }
            .map { requireNotNull(it.id) }

        if (invalidIds.isNotEmpty()) {
            throw OpportunityValidationException(
                message = "Only active approved tags can be used",
                details = mapOf("tagIds" to invalidIds.joinToString(","))
            )
        }

        return tagIds.map { tagsById.getValue(it) }
    }

    private fun resolvePlace(request: CreateEmployerOpportunityRequest): ResolvedPlace {
        return when (request.workFormat) {
            WorkFormat.OFFICE,
            WorkFormat.HYBRID -> resolveOfficeOrHybridPlace(request)
            WorkFormat.REMOTE,
            WorkFormat.ONLINE -> resolveRemoteOrOnlinePlace(request)
        }
    }

    private fun resolveOfficeOrHybridPlace(request: CreateEmployerOpportunityRequest): ResolvedPlace {
        val locationId = request.locationId
            ?: throw OpportunityValidationException(
                message = "${request.workFormat.name} requires locationId",
                details = mapOf("locationId" to "must not be null for ${request.workFormat.name}")
            )

        val location = locationDao.findByIdAndIsActiveTrue(locationId)
            .orElseThrow {
                OpportunityValidationException(
                    message = "locationId is invalid",
                    details = mapOf("locationId" to locationId.toString())
                )
            }

        val locationCityId = requireNotNull(location.cityId)
        val city = cityDao.findByIdAndIsActiveTrue(locationCityId)
            .orElseThrow {
                OpportunityValidationException(
                    message = "Location references inactive or missing city",
                    details = mapOf("locationId" to locationId.toString())
                )
            }

        if (request.cityId != null && request.cityId != locationCityId) {
            throw OpportunityValidationException(
                message = "cityId must match location city",
                details = mapOf(
                    "cityId" to request.cityId.toString(),
                    "locationCityId" to locationCityId.toString()
                )
            )
        }

        return ResolvedPlace(
            city = city,
            location = location
        )
    }

    private fun resolveRemoteOrOnlinePlace(request: CreateEmployerOpportunityRequest): ResolvedPlace {
        if (request.locationId != null) {
            throw OpportunityValidationException(
                message = "${request.workFormat.name} must not contain locationId",
                details = mapOf("locationId" to "must be null for ${request.workFormat.name}")
            )
        }

        val cityId = request.cityId
            ?: throw OpportunityValidationException(
                message = "${request.workFormat.name} requires cityId",
                details = mapOf("cityId" to "must not be null for ${request.workFormat.name}")
            )

        val city = cityDao.findByIdAndIsActiveTrue(cityId)
            .orElseThrow {
                OpportunityValidationException(
                    message = "cityId is invalid",
                    details = mapOf("cityId" to cityId.toString())
                )
            }

        return ResolvedPlace(
            city = city,
            location = null
        )
    }

    private fun buildResourceLinks(
        opportunity: OpportunityDto,
        request: CreateEmployerOpportunityRequest
    ): MutableList<OpportunityResourceLinkDto> {
        return request.resourceLinks
            .mapIndexed { index, item ->
                OpportunityResourceLinkDto().apply {
                    id = OpportunityResourceLinkId(sortOrder = index)
                    this.opportunity = opportunity
                    label = item.label.trim()
                    linkType = item.linkType
                    url = item.url.trim()
                }
            }
            .toMutableList()
    }

    private fun CreateEmployerOpportunityContactInfoRequest.toModel(): OpportunityContactInfo {
        return OpportunityContactInfo(
            email = email.normalizeNullableText()?.lowercase(Locale.ROOT),
            phone = phone.normalizeNullableText(),
            telegram = telegram.normalizeNullableText(),
            contactPerson = contactPerson.normalizeNullableText()
        )
    }

    private fun String?.normalizeNullableText(): String? {
        val normalized = this?.trim()
        return if (normalized.isNullOrBlank()) {
            null
        } else {
            normalized
        }
    }

    private data class ResolvedPlace(
        val city: CityDto,
        val location: LocationDto?
    )
}
