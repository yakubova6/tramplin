package ru.itplanet.trampline.interaction.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseDto

interface OpportunityResponseDao : JpaRepository<OpportunityResponseDto, Long> {
    fun findByApplicantUserId(userId: Long): List<OpportunityResponseDto>
    fun findByOpportunityId(opportunityId: Long): List<OpportunityResponseDto>
    fun existsByApplicantUserIdAndOpportunityId(userId: Long, opportunityId: Long): Boolean
    fun findByApplicantUserIdAndOpportunityId(userId: Long, opportunityId: Long): OpportunityResponseDto?
}