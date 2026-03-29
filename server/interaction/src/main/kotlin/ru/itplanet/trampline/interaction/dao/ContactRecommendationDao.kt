package ru.itplanet.trampline.interaction.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.dao.dto.ContactRecommendationDto

interface ContactRecommendationDao : JpaRepository<ContactRecommendationDto, Long> {

    fun existsByOpportunityIdAndFromApplicantUserIdAndToApplicantUserId(
        opportunityId: Long,
        fromApplicantUserId: Long,
        toApplicantUserId: Long,
    ): Boolean

    fun findByToApplicantUserIdOrderByCreatedAtDescIdDesc(
        toApplicantUserId: Long,
    ): List<ContactRecommendationDto>

    fun findByFromApplicantUserIdOrderByCreatedAtDescIdDesc(
        fromApplicantUserId: Long,
    ): List<ContactRecommendationDto>

    fun findByIdAndFromApplicantUserId(
        id: Long,
        fromApplicantUserId: Long,
    ): ContactRecommendationDto?
}
