package ru.itplanet.trampline.opportunity.dao

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import java.util.Optional

interface OpportunityDao :
    JpaRepository<OpportunityDto, Long>,
    JpaSpecificationExecutor<OpportunityDto> {

    fun findByIdAndEmployerUserId(id: Long, employerUserId: Long): Optional<OpportunityDto>
}
