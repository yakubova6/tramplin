package ru.itplanet.trampline.interaction.dao

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseDto

interface OpportunityResponseDao : JpaRepository<OpportunityResponseDto, Long> {
    fun findByApplicantUserId(userId: Long): List<OpportunityResponseDto>
    fun findByOpportunityId(opportunityId: Long): List<OpportunityResponseDto>
    fun existsByApplicantUserIdAndOpportunityId(userId: Long, opportunityId: Long): Boolean
    fun findByApplicantUserIdAndOpportunityId(userId: Long, opportunityId: Long): OpportunityResponseDto?

    @Query(
        value = """
            SELECT EXISTS (
                SELECT 1
                FROM opportunity_response r
                JOIN opportunity o ON o.id = r.opportunity_id
                WHERE r.applicant_user_id = :applicantUserId
                  AND o.employer_user_id = :employerUserId
            )
        """,
        nativeQuery = true,
    )
    fun existsEmployerAccessToApplicantProfile(
        @Param("employerUserId") employerUserId: Long,
        @Param("applicantUserId") applicantUserId: Long,
    ): Boolean
}
