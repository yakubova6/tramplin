package ru.itplanet.trampline.profile.dao

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.profile.dao.dto.ApplicantProfileDto

interface ApplicantProfileDao : JpaRepository<ApplicantProfileDto, Long> {

    @Query(
        value = """
            SELECT ap.user_id
            FROM applicant_profile ap
            WHERE ap.user_id <> :currentUserId
              AND ap.profile_visibility IN ('PUBLIC', 'AUTHENTICATED')
              AND (
                    :search IS NULL
                    OR LOWER(COALESCE(ap.first_name, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(ap.last_name, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(ap.middle_name, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(CONCAT_WS(
                        ' ',
                        COALESCE(ap.first_name, ''),
                        COALESCE(ap.last_name, ''),
                        COALESCE(ap.middle_name, '')
                    )) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(ap.university_name, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(ap.faculty_name, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(ap.study_program, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(ap.about, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
              AND (:cityId IS NULL OR ap.city_id = :cityId)
              AND (:openToWork IS NULL OR ap.open_to_work = :openToWork)
              AND (:openToEvents IS NULL OR ap.open_to_events = :openToEvents)
              AND (
                    :skillTagIdsEmpty = TRUE
                    OR (
                        ap.resume_visibility IN ('PUBLIC', 'AUTHENTICATED')
                        AND EXISTS (
                            SELECT 1
                            FROM applicant_tag at
                            WHERE at.applicant_user_id = ap.user_id
                              AND at.relation_type = 'SKILL'
                              AND at.tag_id IN (:skillTagIds)
                        )
                    )
              )
              AND (
                    :interestTagIdsEmpty = TRUE
                    OR (
                        ap.resume_visibility IN ('PUBLIC', 'AUTHENTICATED')
                        AND EXISTS (
                            SELECT 1
                            FROM applicant_tag at
                            WHERE at.applicant_user_id = ap.user_id
                              AND at.relation_type = 'INTEREST'
                              AND at.tag_id IN (:interestTagIds)
                        )
                    )
              )
            ORDER BY ap.open_to_work DESC, ap.open_to_events DESC, ap.updated_at DESC NULLS LAST, ap.user_id DESC
            LIMIT :limit OFFSET :offset
        """,
        nativeQuery = true,
    )
    fun searchApplicantUserIds(
        @Param("currentUserId") currentUserId: Long,
        @Param("search") search: String?,
        @Param("cityId") cityId: Long?,
        @Param("openToWork") openToWork: Boolean?,
        @Param("openToEvents") openToEvents: Boolean?,
        @Param("skillTagIds") skillTagIds: List<Long>,
        @Param("skillTagIdsEmpty") skillTagIdsEmpty: Boolean,
        @Param("interestTagIds") interestTagIds: List<Long>,
        @Param("interestTagIdsEmpty") interestTagIdsEmpty: Boolean,
        @Param("limit") limit: Int,
        @Param("offset") offset: Long,
    ): List<Long>

    @Query(
        value = """
            SELECT COUNT(*)
            FROM applicant_profile ap
            WHERE ap.user_id <> :currentUserId
              AND ap.profile_visibility IN ('PUBLIC', 'AUTHENTICATED')
              AND (
                    :search IS NULL
                    OR LOWER(COALESCE(ap.first_name, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(ap.last_name, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(ap.middle_name, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(CONCAT_WS(
                        ' ',
                        COALESCE(ap.first_name, ''),
                        COALESCE(ap.last_name, ''),
                        COALESCE(ap.middle_name, '')
                    )) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(ap.university_name, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(ap.faculty_name, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(ap.study_program, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(ap.about, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
              AND (:cityId IS NULL OR ap.city_id = :cityId)
              AND (:openToWork IS NULL OR ap.open_to_work = :openToWork)
              AND (:openToEvents IS NULL OR ap.open_to_events = :openToEvents)
              AND (
                    :skillTagIdsEmpty = TRUE
                    OR (
                        ap.resume_visibility IN ('PUBLIC', 'AUTHENTICATED')
                        AND EXISTS (
                            SELECT 1
                            FROM applicant_tag at
                            WHERE at.applicant_user_id = ap.user_id
                              AND at.relation_type = 'SKILL'
                              AND at.tag_id IN (:skillTagIds)
                        )
                    )
              )
              AND (
                    :interestTagIdsEmpty = TRUE
                    OR (
                        ap.resume_visibility IN ('PUBLIC', 'AUTHENTICATED')
                        AND EXISTS (
                            SELECT 1
                            FROM applicant_tag at
                            WHERE at.applicant_user_id = ap.user_id
                              AND at.relation_type = 'INTEREST'
                              AND at.tag_id IN (:interestTagIds)
                        )
                    )
              )
        """,
        nativeQuery = true,
    )
    fun countApplicantUserIds(
        @Param("currentUserId") currentUserId: Long,
        @Param("search") search: String?,
        @Param("cityId") cityId: Long?,
        @Param("openToWork") openToWork: Boolean?,
        @Param("openToEvents") openToEvents: Boolean?,
        @Param("skillTagIds") skillTagIds: List<Long>,
        @Param("skillTagIdsEmpty") skillTagIdsEmpty: Boolean,
        @Param("interestTagIds") interestTagIds: List<Long>,
        @Param("interestTagIdsEmpty") interestTagIdsEmpty: Boolean,
    ): Long
}
