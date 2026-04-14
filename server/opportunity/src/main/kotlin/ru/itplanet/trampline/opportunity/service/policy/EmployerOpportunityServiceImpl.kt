package ru.itplanet.trampline.opportunity.service

import org.slf4j.LoggerFactory
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.dao.CityDao
import ru.itplanet.trampline.commons.dao.LocationDao
import ru.itplanet.trampline.commons.dao.dto.CityDto
import ru.itplanet.trampline.commons.dao.dto.LocationDto
import ru.itplanet.trampline.commons.model.OpportunityContactInfo
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.opportunity.client.MediaServiceClient
import ru.itplanet.trampline.opportunity.converter.EmployerOpportunityConverter
import ru.itplanet.trampline.opportunity.dao.EmployerProfileDao
import ru.itplanet.trampline.opportunity.dao.OpportunityDao
import ru.itplanet.trampline.opportunity.dao.TagDao
import ru.itplanet.trampline.opportunity.dao.dto.EmployerProfileDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityResourceLinkDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityResourceLinkId
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.dao.specification.EmployerOpportunitySpecification
import ru.itplanet.trampline.opportunity.exception.OpportunityNotFoundException
import ru.itplanet.trampline.opportunity.exception.OpportunityValidationException
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityCard
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityEditPayload
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityListItem
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityMediaItem
import ru.itplanet.trampline.opportunity.model.OpportunityPage
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerOpportunityContactInfoRequest
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerOpportunityRequest
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerOpportunityResourceLinkRequest
import ru.itplanet.trampline.opportunity.model.request.GetEmployerOpportunityListRequest
import ru.itplanet.trampline.opportunity.service.policy.EmployerOpportunityCreatePolicy
import ru.itplanet.trampline.opportunity.util.OffsetBasedPageRequest
import ru.itplanet.trampline.opportunity.validation.OpportunityDomainValidator
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Locale

@Service
class EmployerOpportunityServiceImpl(
    private val opportunityDao: OpportunityDao,
    private val tagDao: TagDao,
    private val cityDao: CityDao,
    private val locationDao: LocationDao,
    private val employerProfileDao: EmployerProfileDao,
    private val employerOpportunityConverter: EmployerOpportunityConverter,
    private val employerOpportunityCreatePolicy: EmployerOpportunityCreatePolicy,
    private val opportunityDomainValidator: OpportunityDomainValidator,
    private val mediaServiceClient: MediaServiceClient,
) : EmployerOpportunityService {

    @Transactional
    override fun create(
        currentUserId: Long,
        request: CreateEmployerOpportunityRequest,
    ): EmployerOpportunityCard {
        employerOpportunityCreatePolicy.checkCreateAllowed(currentUserId)

        validateSalary(request)
        validateTemporalFields(request)

        val employerProfile = getEmployerProfileOrThrow(currentUserId)
        val companyNameFromProfile = employerProfile.companyName ?: employerProfile.legalName ?: ""

        val resolvedTags = resolveTags(request.tagIds.distinct())
        val resolvedPlace = resolvePlace(
            currentUserId = currentUserId,
            employerProfile = employerProfile,
            request = request,
        )

        val opportunity = OpportunityDto().apply {
            employerUserId = currentUserId
            status = OpportunityStatus.DRAFT
            publishedAt = null
            moderationComment = null
            companyName = companyNameFromProfile
        }

        applyEditableFieldsOnCreate(
            opportunity = opportunity,
            request = request,
            resolvedTags = resolvedTags,
            resolvedPlace = resolvedPlace,
        )
        opportunityDomainValidator.validate(opportunity)

        val saved = opportunityDao.saveAndFlush(opportunity)
        return employerOpportunityConverter.toCard(saved)
    }

    @Transactional(readOnly = true)
    override fun getMyOpportunities(
        currentUserId: Long,
        request: GetEmployerOpportunityListRequest,
    ): OpportunityPage<EmployerOpportunityListItem> {
        val pageable = OffsetBasedPageRequest(
            limit = request.limit,
            offset = request.offset,
            sort = Sort.by(request.sortDirection.toSpring(), request.sortBy.property),
        )

        val page = opportunityDao.findAll(
            EmployerOpportunitySpecification.build(currentUserId, request),
            pageable,
        )

        return OpportunityPage(
            items = page.content.map(employerOpportunityConverter::toListItem),
            limit = request.limit,
            offset = request.offset,
            total = page.totalElements,
        )
    }

    @Transactional(readOnly = true)
    override fun getMyOpportunity(
        currentUserId: Long,
        opportunityId: Long,
    ): EmployerOpportunityEditPayload {
        val opportunity = getOwnedOpportunity(opportunityId, currentUserId)
        return buildEditPayload(opportunity)
    }

    @Transactional
    override fun update(
        currentUserId: Long,
        opportunityId: Long,
        request: CreateEmployerOpportunityRequest,
    ): EmployerOpportunityEditPayload {
        val opportunity = getOwnedOpportunity(opportunityId, currentUserId)

        validateEditableStatus(opportunity.status)
        validateSalary(request)
        validateTemporalFields(request)

        val employerProfile = getEmployerProfileOrThrow(currentUserId)
        val resolvedTags = resolveTags(request.tagIds.distinct())
        val resolvedPlace = resolvePlace(
            currentUserId = currentUserId,
            employerProfile = employerProfile,
            request = request,
        )

        applyEditableFieldsOnUpdate(
            opportunity = opportunity,
            request = request,
            resolvedTags = resolvedTags,
            resolvedPlace = resolvedPlace,
        )
        opportunityDomainValidator.validate(opportunity)

        opportunity.status = OpportunityStatus.DRAFT
        opportunity.publishedAt = null
        opportunity.moderationComment = null

        val saved = opportunityDao.saveAndFlush(opportunity)
        return buildEditPayload(saved)
    }

    @Transactional
    override fun returnToDraft(
        currentUserId: Long,
        opportunityId: Long,
    ): EmployerOpportunityEditPayload {
        val opportunity = getOwnedOpportunity(opportunityId, currentUserId)

        validateReturnToDraftAllowed(opportunity.status)

        opportunity.status = OpportunityStatus.DRAFT
        opportunity.publishedAt = null
        opportunity.moderationComment = null

        val saved = opportunityDao.saveAndFlush(opportunity)
        return buildEditPayload(saved)
    }

    @Transactional
    override fun close(
        currentUserId: Long,
        opportunityId: Long,
    ): EmployerOpportunityEditPayload {
        val opportunity = getOwnedOpportunity(opportunityId, currentUserId)

        validateCloseAllowed(opportunity.status)

        opportunity.status = OpportunityStatus.CLOSED

        val saved = opportunityDao.saveAndFlush(opportunity)
        return buildEditPayload(saved)
    }

    @Transactional
    override fun archive(
        currentUserId: Long,
        opportunityId: Long,
    ): EmployerOpportunityEditPayload {
        val opportunity = getOwnedOpportunity(opportunityId, currentUserId)

        validateArchiveAllowed(opportunity.status)

        opportunity.status = OpportunityStatus.ARCHIVED

        val saved = opportunityDao.saveAndFlush(opportunity)
        return buildEditPayload(saved)
    }

    private fun buildEditPayload(
        opportunity: OpportunityDto,
    ): EmployerOpportunityEditPayload {
        val opportunityId = requireNotNull(opportunity.id)

        return employerOpportunityConverter.toEditPayload(opportunity).copy(
            media = loadOpportunityMedia(opportunityId),
        )
    }

    private fun loadOpportunityMedia(
        opportunityId: Long,
    ): List<EmployerOpportunityMediaItem> {
        return try {
            mediaServiceClient.getAttachments(
                entityType = FileAttachmentEntityType.OPPORTUNITY,
                entityId = opportunityId,
            )
                .filter { it.attachmentRole == FileAttachmentRole.MEDIA }
                .sortedWith(compareBy<InternalFileAttachmentResponse>({ it.sortOrder }, { it.attachmentId }))
                .map { attachment ->
                    EmployerOpportunityMediaItem(
                        attachmentId = attachment.attachmentId,
                        fileId = attachment.fileId,
                        originalFileName = attachment.file.originalFileName,
                        mediaType = attachment.file.mediaType,
                        sortOrder = attachment.sortOrder,
                        downloadUrl = runCatching {
                            mediaServiceClient.getDownloadUrl(attachment.fileId).url
                        }.getOrNull(),
                    )
                }
        } catch (ex: Exception) {
            logger.warn("Failed to load opportunity media for opportunityId={}", opportunityId, ex)
            emptyList()
        }
    }

    private fun getOwnedOpportunity(
        opportunityId: Long,
        currentUserId: Long,
    ): OpportunityDto {
        return opportunityDao.findByIdAndEmployerUserId(opportunityId, currentUserId)
            .orElseThrow { OpportunityNotFoundException(opportunityId) }
    }

    private fun getEmployerProfileOrThrow(
        currentUserId: Long,
    ): EmployerProfileDto {
        return employerProfileDao.findByUserId(currentUserId)
            .orElseThrow {
                OpportunityValidationException(
                    message = "Профиль работодателя не найден",
                    details = mapOf("userId" to currentUserId.toString()),
                )
            }
    }

    private fun validateEditableStatus(status: OpportunityStatus) {
        if (status == OpportunityStatus.DRAFT || status == OpportunityStatus.REJECTED) {
            return
        }

        throw OpportunityValidationException(
            message = "Возможность нельзя редактировать в текущем статусе",
            details = mapOf(
                "status" to status.name,
                "allowedStatuses" to "DRAFT,REJECTED",
            ),
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
                message = "Возможность уже находится в статусе DRAFT",
                details = mapOf("status" to status.name),
            )

            OpportunityStatus.PUBLISHED -> throw OpportunityValidationException(
                message = "Опубликованную возможность нельзя вернуть в DRAFT этим действием",
                details = mapOf("status" to status.name),
            )
        }
    }

    private fun validateCloseAllowed(status: OpportunityStatus) {
        when (status) {
            OpportunityStatus.PUBLISHED -> return

            OpportunityStatus.CLOSED -> throw OpportunityValidationException(
                message = "Возможность уже находится в статусе CLOSED",
                details = mapOf("status" to status.name),
            )

            OpportunityStatus.ARCHIVED -> throw OpportunityValidationException(
                message = "Архивированную возможность нельзя закрыть",
                details = mapOf("status" to status.name),
            )

            else -> throw OpportunityValidationException(
                message = "Возможность нельзя закрыть в текущем статусе",
                details = mapOf(
                    "status" to status.name,
                    "allowedStatuses" to "PUBLISHED",
                ),
            )
        }
    }

    private fun validateArchiveAllowed(status: OpportunityStatus) {
        when (status) {
            OpportunityStatus.CLOSED,
            OpportunityStatus.REJECTED -> return

            OpportunityStatus.ARCHIVED -> throw OpportunityValidationException(
                message = "Возможность уже находится в статусе ARCHIVED",
                details = mapOf("status" to status.name),
            )

            OpportunityStatus.PUBLISHED -> throw OpportunityValidationException(
                message = "Опубликованную возможность нужно сначала закрыть перед архивированием",
                details = mapOf("status" to status.name),
            )

            else -> throw OpportunityValidationException(
                message = "Возможность нельзя архивировать в текущем статусе",
                details = mapOf(
                    "status" to status.name,
                    "allowedStatuses" to "CLOSED,REJECTED",
                ),
            )
        }
    }

    private fun applyEditableFieldsOnCreate(
        opportunity: OpportunityDto,
        request: CreateEmployerOpportunityRequest,
        resolvedTags: List<TagDto>,
        resolvedPlace: ResolvedPlace,
    ) {
        applyBaseEditableFields(
            opportunity = opportunity,
            request = request,
            resolvedTags = resolvedTags,
            resolvedPlace = resolvedPlace,
        )

        opportunity.resourceLinks = buildResourceLinks(opportunity, request)
    }

    private fun applyEditableFieldsOnUpdate(
        opportunity: OpportunityDto,
        request: CreateEmployerOpportunityRequest,
        resolvedTags: List<TagDto>,
        resolvedPlace: ResolvedPlace,
    ) {
        applyBaseEditableFields(
            opportunity = opportunity,
            request = request,
            resolvedTags = resolvedTags,
            resolvedPlace = resolvedPlace,
        )

        syncResourceLinks(opportunity, request.resourceLinks)
    }

    private fun applyBaseEditableFields(
        opportunity: OpportunityDto,
        request: CreateEmployerOpportunityRequest,
        resolvedTags: List<TagDto>,
        resolvedPlace: ResolvedPlace,
    ) {
        opportunity.title = request.title.trim()
        opportunity.shortDescription = request.shortDescription.trim()
        opportunity.fullDescription = request.fullDescription.normalizeNullableText()
        opportunity.requirements = request.requirements.normalizeNullableText()
        opportunity.type = request.type
        opportunity.workFormat = request.workFormat
        opportunity.employmentType = request.employmentType
        opportunity.grade = request.grade
        opportunity.salaryFrom = request.salaryFrom
        opportunity.salaryTo = request.salaryTo
        opportunity.salaryCurrency = request.salaryCurrency.trim().uppercase(Locale.ROOT)
        opportunity.expiresAt = request.expiresAt
        opportunity.eventDate = request.eventDate
        opportunity.cityId = resolvedPlace.city?.id
        opportunity.city = resolvedPlace.city
        opportunity.locationId = resolvedPlace.location?.id
        opportunity.location = resolvedPlace.location
        opportunity.contactInfo = request.contactInfo.toModel()

        opportunity.tags.clear()
        opportunity.tags.addAll(resolvedTags)
    }

    private fun syncResourceLinks(
        opportunity: OpportunityDto,
        requestedLinks: List<CreateEmployerOpportunityResourceLinkRequest>,
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
                    },
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
                message = "salaryFrom не может быть больше salaryTo",
                details = mapOf(
                    "salaryFrom" to salaryFrom.toString(),
                    "salaryTo" to salaryTo.toString(),
                ),
            )
        }
    }

    private fun validateTemporalFields(request: CreateEmployerOpportunityRequest) {
        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val today = now.toLocalDate()

        if (request.type == OpportunityType.EVENT) {
            if (request.eventDate == null) {
                throw OpportunityValidationException(
                    message = "Для EVENT необходимо указать eventDate",
                    details = mapOf("eventDate" to "для EVENT поле обязательно"),
                )
            }

            if (request.expiresAt != null) {
                throw OpportunityValidationException(
                    message = "Для EVENT нельзя передавать expiresAt",
                    details = mapOf("expiresAt" to "для EVENT поле должно быть null"),
                )
            }

            if (request.eventDate.isBefore(today)) {
                throw OpportunityValidationException(
                    message = "eventDate не может быть в прошлом",
                    details = mapOf("eventDate" to request.eventDate.toString()),
                )
            }
        } else {
            if (request.eventDate != null) {
                throw OpportunityValidationException(
                    message = "Только для EVENT можно передавать eventDate",
                    details = mapOf("eventDate" to "для не-EVENT поле должно быть null"),
                )
            }

            if (request.expiresAt != null && request.expiresAt.isBefore(now)) {
                throw OpportunityValidationException(
                    message = "expiresAt не может быть в прошлом",
                    details = mapOf("expiresAt" to request.expiresAt.toString()),
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
                message = "Некоторые tagIds не существуют",
                details = mapOf("tagIds" to missingIds.joinToString(",")),
            )
        }

        val invalidIds = tags
            .filter { !it.isActive || it.moderationStatus != TagModerationStatus.APPROVED }
            .map { requireNotNull(it.id) }

        if (invalidIds.isNotEmpty()) {
            throw OpportunityValidationException(
                message = "Можно использовать только активные и одобренные теги",
                details = mapOf("tagIds" to invalidIds.joinToString(",")),
            )
        }

        return tagIds.map { tagsById.getValue(it) }
    }

    private fun resolvePlace(
        currentUserId: Long,
        employerProfile: EmployerProfileDto,
        request: CreateEmployerOpportunityRequest,
    ): ResolvedPlace {
        return when (request.workFormat) {
            WorkFormat.OFFICE,
            WorkFormat.HYBRID -> resolveOfficeOrHybridPlace(
                currentUserId = currentUserId,
                request = request,
            )

            WorkFormat.REMOTE,
            WorkFormat.ONLINE -> resolveRemoteOrOnlinePlace(
                employerProfile = employerProfile,
                request = request,
            )
        }
    }

    private fun resolveOfficeOrHybridPlace(
        currentUserId: Long,
        request: CreateEmployerOpportunityRequest,
    ): ResolvedPlace {
        val locationId = request.locationId
            ?: throw OpportunityValidationException(
                message = "Для ${request.workFormat.name} необходимо указать locationId",
                details = mapOf("locationId" to "для ${request.workFormat.name} поле обязательно"),
            )

        val location = locationDao.findByIdAndIsActiveTrue(locationId)
            .orElseThrow {
                OpportunityValidationException(
                    message = "Передан некорректный locationId",
                    details = mapOf("locationId" to locationId.toString()),
                )
            }

        if (location.ownerEmployerUserId == null || location.ownerEmployerUserId != currentUserId) {
            throw OpportunityValidationException(
                message = "Можно использовать только собственные активные локации работодателя",
                details = mapOf("locationId" to locationId.toString()),
            )
        }

        val locationCityId = requireNotNull(location.cityId)
        cityDao.findByIdAndIsActiveTrue(locationCityId)
            .orElseThrow {
                OpportunityValidationException(
                    message = "Указанная локация ссылается на неактивный или отсутствующий город",
                    details = mapOf("locationId" to locationId.toString()),
                )
            }

        request.cityId?.let { cityId ->
            if (cityId != locationCityId) {
                throw OpportunityValidationException(
                    message = "Для ${request.workFormat.name} cityId может быть передан только если он совпадает с городом выбранной локации",
                    details = mapOf(
                        "workFormat" to request.workFormat.name,
                        "cityId" to cityId.toString(),
                        "locationId" to locationId.toString(),
                        "locationCityId" to locationCityId.toString(),
                    ),
                )
            }
        }

        return ResolvedPlace(
            city = null,
            location = location,
        )
    }

    private fun resolveRemoteOrOnlinePlace(
        employerProfile: EmployerProfileDto,
        request: CreateEmployerOpportunityRequest,
    ): ResolvedPlace {
        if (request.locationId != null) {
            throw OpportunityValidationException(
                message = "Для ${request.workFormat.name} нельзя передавать locationId",
                details = mapOf(
                    "workFormat" to request.workFormat.name,
                    "locationId" to request.locationId.toString(),
                ),
            )
        }

        val effectiveCityId = request.cityId ?: employerProfile.city?.id
        ?: throw OpportunityValidationException(
            message = "Для ${request.workFormat.name} необходимо указать cityId или иметь город в профиле работодателя",
            details = mapOf(
                "cityId" to "для ${request.workFormat.name} поле обязательно, если в профиле работодателя не указан город",
            ),
        )

        val city = cityDao.findByIdAndIsActiveTrue(effectiveCityId)
            .orElseThrow {
                OpportunityValidationException(
                    message = "Передан некорректный cityId",
                    details = mapOf("cityId" to effectiveCityId.toString()),
                )
            }

        return ResolvedPlace(
            city = city,
            location = null,
        )
    }

    private fun buildResourceLinks(
        opportunity: OpportunityDto,
        request: CreateEmployerOpportunityRequest,
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
            contactPerson = contactPerson.normalizeNullableText(),
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
        val city: CityDto?,
        val location: LocationDto?,
    )

    private companion object {
        private val logger = LoggerFactory.getLogger(EmployerOpportunityServiceImpl::class.java)
    }
}
