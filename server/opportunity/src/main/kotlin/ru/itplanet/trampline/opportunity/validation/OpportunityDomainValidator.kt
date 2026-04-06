package ru.itplanet.trampline.opportunity.validation

import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
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
            WorkFormat.OFFICE, WorkFormat.HYBRID -> {
                require(opportunity.cityId != null && opportunity.locationId != null) {
                    "For OFFICE or HYBRID work format, both cityId and locationId must be provided"
                }
            }
            else -> {
                // do nothing
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
}