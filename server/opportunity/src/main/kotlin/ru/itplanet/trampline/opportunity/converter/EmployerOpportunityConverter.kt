package ru.itplanet.trampline.opportunity.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.opportunity.dao.dto.CityDto
import ru.itplanet.trampline.opportunity.dao.dto.LocationDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityResourceLinkDto
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.model.CitySummary
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityCard
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityEditPayload
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityListItem
import ru.itplanet.trampline.opportunity.model.LocationPreview
import ru.itplanet.trampline.opportunity.model.OpportunityResourceLink
import ru.itplanet.trampline.opportunity.model.enums.EmployerOpportunityCabinetGroup
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus
import java.util.Locale

@Component
class EmployerOpportunityConverter(
    private val tagConverter: TagConverter
) {

    fun toCard(source: OpportunityDto): EmployerOpportunityCard {
        return EmployerOpportunityCard(
            id = requireNotNull(source.id),
            title = source.title,
            shortDescription = source.shortDescription,
            fullDescription = source.fullDescription,
            requirements = source.requirements,
            companyName = source.companyName,
            type = source.type,
            workFormat = source.workFormat,
            employmentType = source.employmentType,
            grade = source.grade,
            salaryFrom = source.salaryFrom,
            salaryTo = source.salaryTo,
            salaryCurrency = source.salaryCurrency,
            status = source.status,
            group = EmployerOpportunityCabinetGroup.fromStatus(source.status),
            publishedAt = source.publishedAt,
            expiresAt = source.expiresAt,
            eventDate = source.eventDate,
            city = toCitySummary(resolveCity(source)),
            location = toLocationPreview(source.location),
            contactInfo = source.contactInfo,
            resourceLinks = source.resourceLinks
                .sortedBy { it.id.sortOrder }
                .map(::toResourceLink),
            tags = source.tags
                .approvedActiveTags()
                .map(tagConverter::toModel),
            moderationComment = source.moderationComment,
            createdAt = source.createdAt,
            updatedAt = source.updatedAt
        )
    }

    fun toListItem(source: OpportunityDto): EmployerOpportunityListItem {
        return EmployerOpportunityListItem(
            id = requireNotNull(source.id),
            title = source.title,
            shortDescription = source.shortDescription,
            companyName = source.companyName,
            type = source.type,
            workFormat = source.workFormat,
            employmentType = source.employmentType,
            grade = source.grade,
            salaryFrom = source.salaryFrom,
            salaryTo = source.salaryTo,
            salaryCurrency = source.salaryCurrency,
            status = source.status,
            group = EmployerOpportunityCabinetGroup.fromStatus(source.status),
            publishedAt = source.publishedAt,
            expiresAt = source.expiresAt,
            eventDate = source.eventDate,
            city = toCitySummary(resolveCity(source)),
            locationPreview = toLocationPreview(source.location),
            tags = source.tags
                .approvedActiveTags()
                .map(tagConverter::toModel),
            moderationComment = source.moderationComment,
            createdAt = source.createdAt,
            updatedAt = source.updatedAt
        )
    }

    fun toEditPayload(source: OpportunityDto): EmployerOpportunityEditPayload {
        return EmployerOpportunityEditPayload(
            id = requireNotNull(source.id),
            title = source.title,
            shortDescription = source.shortDescription,
            fullDescription = source.fullDescription,
            requirements = source.requirements,
            companyName = source.companyName,
            type = source.type,
            workFormat = source.workFormat,
            employmentType = source.employmentType,
            grade = source.grade,
            salaryFrom = source.salaryFrom,
            salaryTo = source.salaryTo,
            salaryCurrency = source.salaryCurrency,
            status = source.status,
            publishedAt = source.publishedAt,
            expiresAt = source.expiresAt,
            eventDate = source.eventDate,
            cityId = source.cityId ?: source.location?.cityId,
            locationId = source.locationId,
            contactInfo = source.contactInfo,
            resourceLinks = source.resourceLinks
                .sortedBy { it.id.sortOrder }
                .map(::toResourceLink),
            tagIds = source.tags
                .map { requireNotNull(it.id) }
                .sorted(),
            moderationComment = source.moderationComment,
            createdAt = source.createdAt,
            updatedAt = source.updatedAt
        )
    }

    private fun resolveCity(source: OpportunityDto): CityDto? {
        return source.city ?: source.location?.city
    }

    private fun toCitySummary(source: CityDto?): CitySummary? {
        if (source == null) {
            return null
        }

        return CitySummary(
            id = requireNotNull(source.id),
            name = source.name,
            regionName = source.regionName,
            countryCode = source.countryCode,
            latitude = source.latitude?.toDouble(),
            longitude = source.longitude?.toDouble()
        )
    }

    private fun toLocationPreview(source: LocationDto?): LocationPreview? {
        if (source == null) {
            return null
        }

        return LocationPreview(
            id = requireNotNull(source.id),
            title = source.title,
            addressLine = source.addressLine,
            addressLine2 = source.addressLine2,
            postalCode = source.postalCode,
            latitude = source.latitude?.toDouble(),
            longitude = source.longitude?.toDouble()
        )
    }

    private fun toResourceLink(source: OpportunityResourceLinkDto): OpportunityResourceLink {
        return OpportunityResourceLink(
            sortOrder = source.id.sortOrder,
            label = source.label,
            linkType = source.linkType,
            url = source.url
        )
    }

    private fun Iterable<TagDto>.approvedActiveTags(): List<TagDto> {
        return this
            .filter { it.isActive && it.moderationStatus == TagModerationStatus.APPROVED }
            .sortedWith(compareBy<TagDto>({ it.category.name }, { it.name.lowercase(Locale.ROOT) }))
    }
}
