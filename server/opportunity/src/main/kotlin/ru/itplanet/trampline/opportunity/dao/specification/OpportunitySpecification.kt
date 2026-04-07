package ru.itplanet.trampline.opportunity.dao.specification

import jakarta.persistence.criteria.JoinType
import org.springframework.data.jpa.domain.Specification
import ru.itplanet.trampline.commons.dao.dto.CityDto
import ru.itplanet.trampline.commons.dao.dto.LocationDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import ru.itplanet.trampline.opportunity.model.request.GetOpportunityListRequest
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime

object OpportunitySpecification {

    fun build(
        request: GetOpportunityListRequest,
        now: OffsetDateTime,
    ): Specification<OpportunityDto> {
        return Specification.allOf(
            publicVisible(now),
            hasType(request.type),
            hasWorkFormat(request.workFormat),
            hasCityId(request.cityId),
            matchesSearch(request.search),
            matchesSalaryFrom(request.salaryFrom),
            matchesSalaryTo(request.salaryTo),
            hasAnyTagIds(request.tagIds),
        )
    }

    fun buildForMap(
        request: GetOpportunityListRequest,
        now: OffsetDateTime,
    ): Specification<OpportunityDto> {
        return Specification.allOf(
            build(request, now),
            mappableForMap(),
        )
    }

    fun publicById(
        id: Long,
        now: OffsetDateTime,
    ): Specification<OpportunityDto> {
        return Specification.allOf(
            publicVisible(now),
            hasId(id),
        )
    }

    private fun publicVisible(now: OffsetDateTime): Specification<OpportunityDto> {
        val today = now.toLocalDate()

        return Specification { root, _, cb ->
            val publishedPredicate = cb.and(
                cb.equal(root.get<OpportunityStatus>("status"), OpportunityStatus.PUBLISHED),
                cb.isNotNull(root.get<OffsetDateTime>("publishedAt")),
                cb.lessThanOrEqualTo(root.get("publishedAt"), now),
            )

            val notEventAndNotExpired = cb.and(
                cb.notEqual(root.get<OpportunityType>("type"), OpportunityType.EVENT),
                cb.or(
                    cb.isNull(root.get<OffsetDateTime>("expiresAt")),
                    cb.greaterThanOrEqualTo(root.get("expiresAt"), now),
                ),
            )

            val eventAndNotPassed = cb.and(
                cb.equal(root.get<OpportunityType>("type"), OpportunityType.EVENT),
                cb.greaterThanOrEqualTo(root.get<LocalDate>("eventDate"), today),
            )

            cb.and(
                publishedPredicate,
                cb.or(notEventAndNotExpired, eventAndNotPassed),
            )
        }
    }

    private fun hasId(id: Long): Specification<OpportunityDto> {
        return Specification { root, _, cb ->
            cb.equal(root.get<Long>("id"), id)
        }
    }

    private fun hasType(type: OpportunityType?): Specification<OpportunityDto> {
        if (type == null) {
            return Specification.unrestricted()
        }

        return Specification { root, _, cb ->
            cb.equal(root.get<OpportunityType>("type"), type)
        }
    }

    private fun hasWorkFormat(workFormat: WorkFormat?): Specification<OpportunityDto> {
        if (workFormat == null) {
            return Specification.unrestricted()
        }

        return Specification { root, _, cb ->
            cb.equal(root.get<WorkFormat>("workFormat"), workFormat)
        }
    }

    private fun hasCityId(cityId: Long?): Specification<OpportunityDto> {
        if (cityId == null) {
            return Specification.unrestricted()
        }

        return Specification { root, query, cb ->
            query?.distinct(true)

            val locationJoin = root.join<OpportunityDto, LocationDto>("location", JoinType.LEFT)
            val locationCityJoin = locationJoin.join<LocationDto, CityDto>("city", JoinType.LEFT)

            cb.or(
                cb.equal(root.get<Long>("cityId"), cityId),
                cb.equal(locationCityJoin.get<Long>("id"), cityId),
            )
        }
    }

    private fun matchesSearch(search: String?): Specification<OpportunityDto> {
        val normalized = search?.trim()?.lowercase()
        if (normalized.isNullOrBlank()) {
            return Specification.unrestricted()
        }

        val pattern = "%$normalized%"

        return Specification { root, _, cb ->
            cb.or(
                cb.like(cb.lower(root.get<String>("title")), pattern),
                cb.like(cb.lower(root.get<String>("shortDescription")), pattern),
                cb.like(cb.lower(root.get<String>("companyName")), pattern),
                cb.like(cb.lower(root.get<String>("requirements")), pattern),
                cb.like(cb.lower(root.get<String>("fullDescription")), pattern),
            )
        }
    }

    private fun matchesSalaryFrom(minSalary: Int?): Specification<OpportunityDto> {
        if (minSalary == null) {
            return Specification.unrestricted()
        }

        return Specification { root, _, cb ->
            val salaryFrom = root.get<Int>("salaryFrom")
            val salaryTo = root.get<Int>("salaryTo")

            cb.or(
                cb.and(
                    cb.isNotNull(salaryTo),
                    cb.greaterThanOrEqualTo(salaryTo, minSalary),
                ),
                cb.and(
                    cb.isNull(salaryTo),
                    cb.isNotNull(salaryFrom),
                    cb.greaterThanOrEqualTo(salaryFrom, minSalary),
                ),
            )
        }
    }

    private fun matchesSalaryTo(maxSalary: Int?): Specification<OpportunityDto> {
        if (maxSalary == null) {
            return Specification.unrestricted()
        }

        return Specification { root, _, cb ->
            cb.or(
                cb.isNull(root.get<Int>("salaryFrom")),
                cb.lessThanOrEqualTo(root.get("salaryFrom"), maxSalary),
            )
        }
    }

    private fun hasAnyTagIds(tagIds: List<Long>): Specification<OpportunityDto> {
        if (tagIds.isEmpty()) {
            return Specification.unrestricted()
        }

        return Specification { root, query, cb ->
            query?.distinct(true)

            val tagsJoin = root.join<OpportunityDto, TagDto>("tags", JoinType.INNER)

            cb.and(
                tagsJoin.get<Long>("id").`in`(tagIds),
                cb.isTrue(tagsJoin.get("isActive")),
                cb.equal(
                    tagsJoin.get<TagModerationStatus>("moderationStatus"),
                    TagModerationStatus.APPROVED,
                ),
            )
        }
    }

    private fun mappableForMap(): Specification<OpportunityDto> {
        return Specification { root, query, cb ->
            query?.distinct(true)

            val locationJoin = root.join<OpportunityDto, LocationDto>("location", JoinType.LEFT)
            val cityJoin = root.join<OpportunityDto, CityDto>("city", JoinType.LEFT)

            val officeOrHybrid = root.get<WorkFormat>("workFormat").`in`(
                WorkFormat.OFFICE,
                WorkFormat.HYBRID,
            )
            val remoteOrOnline = root.get<WorkFormat>("workFormat").`in`(
                WorkFormat.REMOTE,
                WorkFormat.ONLINE,
            )

            val hasLocationCoordinates = cb.and(
                cb.isNotNull(locationJoin.get<BigDecimal>("latitude")),
                cb.isNotNull(locationJoin.get<BigDecimal>("longitude")),
            )

            val hasCityCoordinates = cb.and(
                cb.isNotNull(cityJoin.get<BigDecimal>("latitude")),
                cb.isNotNull(cityJoin.get<BigDecimal>("longitude")),
            )

            cb.or(
                cb.and(officeOrHybrid, hasLocationCoordinates),
                cb.and(remoteOrOnline, hasCityCoordinates),
            )
        }
    }
}
