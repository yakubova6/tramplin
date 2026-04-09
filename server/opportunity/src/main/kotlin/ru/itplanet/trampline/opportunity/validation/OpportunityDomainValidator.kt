package ru.itplanet.trampline.opportunity.validation

import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.TagCategory
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.exception.OpportunityValidationException
import java.time.LocalDate
import java.time.OffsetDateTime

@Component
class OpportunityDomainValidator {

    fun validate(opportunity: OpportunityDto) {
        validateSalary(opportunity)
        validateTemporalFields(opportunity)
        validateLocationCombination(opportunity)
        validateStatusByDates(opportunity)
        validateEventSpecificRules(opportunity)
        validateTagConflicts(opportunity)
    }

    private fun validateSalary(opportunity: OpportunityDto) {
        opportunity.salaryFrom?.let { from ->
            opportunity.salaryTo?.let { to ->
                require(from <= to) {
                    "salaryFrom ($from) must be less than or equal to salaryTo ($to)"
                }
            }
        }
    }

    private fun validateTemporalFields(opportunity: OpportunityDto) {
        val today = LocalDate.now()
        val todayAsOffsetDateTime = OffsetDateTime.now()

        opportunity.expiresAt?.let { expires ->
            if (opportunity.status in setOf(OpportunityStatus.PUBLISHED, OpportunityStatus.PLANNED) &&
                expires.isBefore(todayAsOffsetDateTime)
            ) {
                throw IllegalArgumentException("Expiration date cannot be in the past for active opportunities")
            }
        }

        if (opportunity.type == OpportunityType.EVENT) {
            opportunity.eventDate?.let { eventDate ->
                require(!eventDate.isBefore(today)) {
                    "Event date cannot be in the past"
                }
            }
        }
    }

    private fun validateLocationCombination(opportunity: OpportunityDto) {
        when (opportunity.workFormat) {
            WorkFormat.OFFICE,
            WorkFormat.HYBRID -> {
                if (opportunity.locationId == null || opportunity.cityId != null) {
                    throw OpportunityValidationException(
                        message = "Для OFFICE или HYBRID должна быть указана только locationId",
                        details = mapOf(
                            "workFormat" to opportunity.workFormat.name,
                            "locationId" to (opportunity.locationId?.toString() ?: "null"),
                            "cityId" to (opportunity.cityId?.toString() ?: "null"),
                        ),
                    )
                }
            }

            WorkFormat.REMOTE,
            WorkFormat.ONLINE -> {
                if (opportunity.cityId == null || opportunity.locationId != null) {
                    throw OpportunityValidationException(
                        message = "Для REMOTE или ONLINE должен быть указан только cityId",
                        details = mapOf(
                            "workFormat" to opportunity.workFormat.name,
                            "locationId" to (opportunity.locationId?.toString() ?: "null"),
                            "cityId" to (opportunity.cityId?.toString() ?: "null"),
                        ),
                    )
                }
            }
        }
    }

    private fun validateStatusByDates(opportunity: OpportunityDto) {
        val todayAsOffsetDateTime = OffsetDateTime.now()
        val today = LocalDate.now()
        when (opportunity.status) {
            OpportunityStatus.PUBLISHED -> {
                require(opportunity.expiresAt?.isAfter(todayAsOffsetDateTime) == true) {
                    "Published opportunity must have expiration date in the future"
                }
            }
            OpportunityStatus.PLANNED -> {
                require(opportunity.expiresAt?.isAfter(todayAsOffsetDateTime) == true) {
                    "Planned opportunity must have expiration date in the future"
                }
                opportunity.eventDate?.let { eventDate ->
                    require(eventDate.isAfter(today)) {
                        "Event date for planned opportunity must be in the future"
                    }
                }
            }
            else -> {
                // do nothing
            }
        }
    }

    private fun validateEventSpecificRules(opportunity: OpportunityDto) {
        if (opportunity.type == OpportunityType.EVENT) {
            require(opportunity.expiresAt == null) {
                "Event type opportunity must not have expiresAt field"
            }
            require(opportunity.eventDate != null) {
                "Event type opportunity must have eventDate"
            }
        }
    }

    private fun validateTagConflicts(opportunity: OpportunityDto) {
        val tags = opportunity.tags
        if (tags.isEmpty()) return

        val categories = tags.groupBy { it.category }

        val singleValueCategories = setOf(TagCategory.GRADE, TagCategory.EMPLOYMENT_TYPE)

        for ((category, tagList) in categories) {
            if (category in singleValueCategories && tagList.size > 1) {
                val tagNames = tagList.joinToString(", ") { it.name }
                throw OpportunityValidationException(
                    message = "Нельзя выбрать более одного тега категории $category",
                    details = mapOf("tags" to tagNames),
                )
            }
        }
    }
}
