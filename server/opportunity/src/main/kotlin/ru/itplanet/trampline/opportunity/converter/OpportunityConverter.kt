package ru.itplanet.trampline.opportunity.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.opportunity.dao.dto.CityDto
import ru.itplanet.trampline.opportunity.dao.dto.LocationDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityResourceLinkDto
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.model.CitySummary
import ru.itplanet.trampline.opportunity.model.LocationPreview
import ru.itplanet.trampline.opportunity.model.OpportunityCard
import ru.itplanet.trampline.opportunity.model.OpportunityListItem
import ru.itplanet.trampline.opportunity.model.OpportunityMapPoint
import ru.itplanet.trampline.opportunity.model.OpportunityMarkerPreview
import ru.itplanet.trampline.opportunity.model.OpportunityResourceLink
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus

@Component
class OpportunityConverter(
    private val tagConverter: TagConverter
) {

    fun toListItem(source: OpportunityDto): OpportunityListItem {
        return OpportunityListItem(
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
            publishedAt = source.publishedAt,
            expiresAt = source.expiresAt,
            eventDate = source.eventDate,
            city = toCitySummary(resolveCity(source)),
            locationPreview = toLocationPreview(source.location),
            tags = source.tags
                .approvedActiveTags()
                .map(tagConverter::toModel)
        )
    }

    fun toCard(source: OpportunityDto): OpportunityCard {
        return OpportunityCard(
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
            mediaLinks = emptyList()
        )
    }

    fun toMapPoint(source: OpportunityDto): OpportunityMapPoint {
        val city = resolveCity(source)
        val location = source.location
        val previewTags = source.tags
            .approvedActiveTags()
            .take(5)
            .map(tagConverter::toModel)

        return OpportunityMapPoint(
            id = requireNotNull(source.id),
            type = source.type,
            title = source.title,
            companyName = source.companyName,
            salaryFrom = source.salaryFrom,
            salaryTo = source.salaryTo,
            salaryCurrency = source.salaryCurrency,
            cityName = city?.name,
            addressLine = location?.addressLine,
            latitude = location?.latitude?.toDouble() ?: city?.latitude?.toDouble(),
            longitude = location?.longitude?.toDouble() ?: city?.longitude?.toDouble(),
            preview = OpportunityMarkerPreview(
                title = source.title,
                companyName = source.companyName,
                shortDescription = source.shortDescription,
                workFormat = source.workFormat,
                salaryFrom = source.salaryFrom,
                salaryTo = source.salaryTo,
                salaryCurrency = source.salaryCurrency,
                tags = previewTags
            )
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
            id = source.id!!,
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
            .sortedWith(compareBy<TagDto>({ it.category.name }, { it.name.lowercase() }))
    }
}
