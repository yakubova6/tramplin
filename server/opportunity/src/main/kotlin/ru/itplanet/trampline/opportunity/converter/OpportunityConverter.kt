package ru.itplanet.trampline.opportunity.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.dao.dto.CityDto
import ru.itplanet.trampline.commons.dao.dto.LocationDto
import ru.itplanet.trampline.commons.model.City
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityResourceLinkDto
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.commons.model.Location
import ru.itplanet.trampline.commons.model.OpportunityCard
import ru.itplanet.trampline.opportunity.model.OpportunityListItem
import ru.itplanet.trampline.opportunity.model.OpportunityMapPoint
import ru.itplanet.trampline.opportunity.model.OpportunityMarkerPreview
import ru.itplanet.trampline.commons.model.OpportunityResourceLink
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus

@Component
class OpportunityConverter(
    private val tagConverter: TagConverter,
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
                .map(tagConverter::toModel),
        )
    }

    fun toCard(source: OpportunityDto): OpportunityCard {
        return OpportunityCard(
            id = requireNotNull(source.id),
            employerUserId = source.employerUserId,
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
            mediaLinks = emptyList(),
            status = source.status,
        )
    }

    fun toMapPoint(source: OpportunityDto): OpportunityMapPoint {
        val city = resolveCity(source)
        val location = source.location
        val previewTags = source.tags
            .approvedActiveTags()
            .take(5)
            .map(tagConverter::toModel)

        val mapCoordinates = resolveMapCoordinates(source, city, location)

        return OpportunityMapPoint(
            id = requireNotNull(source.id),
            type = source.type,
            title = source.title,
            companyName = source.companyName,
            salaryFrom = source.salaryFrom,
            salaryTo = source.salaryTo,
            salaryCurrency = source.salaryCurrency,
            cityName = city?.name,
            addressLine = if (source.workFormat == WorkFormat.OFFICE || source.workFormat == WorkFormat.HYBRID) {
                location?.addressLine
            } else {
                null
            },
            latitude = mapCoordinates.first,
            longitude = mapCoordinates.second,
            preview = OpportunityMarkerPreview(
                title = source.title,
                companyName = source.companyName,
                shortDescription = source.shortDescription,
                workFormat = source.workFormat,
                salaryFrom = source.salaryFrom,
                salaryTo = source.salaryTo,
                salaryCurrency = source.salaryCurrency,
                tags = previewTags,
            ),
        )
    }

    private fun resolveMapCoordinates(
        source: OpportunityDto,
        city: CityDto?,
        location: LocationDto?,
    ): Pair<Double?, Double?> {
        return when (source.workFormat) {
            WorkFormat.OFFICE, WorkFormat.HYBRID -> {
                location?.latitude?.toDouble() to location?.longitude?.toDouble()
            }
            WorkFormat.REMOTE, WorkFormat.ONLINE -> {
                city?.latitude?.toDouble() to city?.longitude?.toDouble()
            }
        }
    }

    private fun resolveCity(source: OpportunityDto): CityDto? {
        return source.city ?: source.location?.city
    }

    private fun toCitySummary(source: CityDto?): City? {
        if (source == null) {
            return null
        }

        return City(
            id = source.id!!,
            name = source.name,
            regionName = source.regionName,
            countryCode = source.countryCode,
            latitude = source.latitude,
            longitude = source.longitude,
        )
    }

    private fun toLocationPreview(source: LocationDto?): Location? {
        if (source == null) {
            return null
        }

        return Location(
            id = requireNotNull(source.id),
            cityId = source.cityId,
            title = source.title,
            addressLine = source.addressLine,
            addressLine2 = source.addressLine2,
            postalCode = source.postalCode,
            latitude = source.latitude,
            longitude = source.longitude,
            city = toCitySummary(source.city),
        )
    }

    private fun toResourceLink(source: OpportunityResourceLinkDto): OpportunityResourceLink {
        return OpportunityResourceLink(
            sortOrder = source.id.sortOrder,
            label = source.label,
            linkType = source.linkType,
            url = source.url,
        )
    }

    private fun Iterable<TagDto>.approvedActiveTags(): List<TagDto> {
        return this
            .filter { it.isActive && it.moderationStatus == TagModerationStatus.APPROVED }
            .sortedWith(compareBy<TagDto>({ it.category.name }, { it.name.lowercase() }))
    }
}
