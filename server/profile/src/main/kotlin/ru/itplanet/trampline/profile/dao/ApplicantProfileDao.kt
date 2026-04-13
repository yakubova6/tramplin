package ru.itplanet.trampline.profile.dao

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.profile.dao.dto.ApplicantProfileDto

interface ApplicantProfileDao : JpaRepository<ApplicantProfileDto, Long> {

    @Query(
        value = """
            WITH public_applicant AS (
                SELECT
                    ap.user_id,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN ap.approved_public_snapshot
                        ELSE NULL
                    END AS snapshot,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'firstName', '')
                        ELSE COALESCE(ap.first_name, '')
                    END AS first_name,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'lastName', '')
                        ELSE COALESCE(ap.last_name, '')
                    END AS last_name,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'middleName', '')
                        ELSE COALESCE(ap.middle_name, '')
                    END AS middle_name,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'universityName', '')
                        ELSE COALESCE(ap.university_name, '')
                    END AS university_name,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'facultyName', '')
                        ELSE COALESCE(ap.faculty_name, '')
                    END AS faculty_name,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'studyProgram', '')
                        ELSE COALESCE(ap.study_program, '')
                    END AS study_program,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'about', '')
                        ELSE COALESCE(ap.about, '')
                    END AS about,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb
                            THEN NULLIF(ap.approved_public_snapshot #>> '{city,id}', '')::bigint
                        ELSE ap.city_id
                    END AS city_id,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb
                            THEN COALESCE((ap.approved_public_snapshot ->> 'openToWork')::boolean, FALSE)
                        ELSE ap.open_to_work
                    END AS open_to_work,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb
                            THEN COALESCE((ap.approved_public_snapshot ->> 'openToEvents')::boolean, FALSE)
                        ELSE ap.open_to_events
                    END AS open_to_events,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb
                            THEN COALESCE(ap.approved_public_snapshot ->> 'profileVisibility', 'PRIVATE')
                        ELSE ap.profile_visibility::text
                    END AS profile_visibility,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb
                            THEN COALESCE(ap.approved_public_snapshot ->> 'resumeVisibility', 'PRIVATE')
                        ELSE ap.resume_visibility::text
                    END AS resume_visibility,
                    ap.updated_at
                FROM applicant_profile ap
                WHERE ap.user_id <> :currentUserId
                  AND (
                      ap.approved_public_snapshot <> '{}'::jsonb
                      OR ap.moderation_status = 'APPROVED'
                  )
            )
            SELECT pa.user_id
            FROM public_applicant pa
            WHERE pa.profile_visibility IN ('PUBLIC', 'AUTHENTICATED')
              AND (
                    :search IS NULL
                    OR LOWER(pa.first_name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(pa.last_name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(pa.middle_name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(CONCAT_WS(' ', pa.first_name, pa.last_name, pa.middle_name))
                        LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(pa.university_name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(pa.faculty_name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(pa.study_program) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(pa.about) LIKE LOWER(CONCAT('%', :search, '%'))
              )
              AND (:cityId IS NULL OR pa.city_id = :cityId)
              AND (:openToWork IS NULL OR pa.open_to_work = :openToWork)
              AND (:openToEvents IS NULL OR pa.open_to_events = :openToEvents)
              AND (
                    :skillTagIdsEmpty = TRUE
                    OR (
                        pa.resume_visibility IN ('PUBLIC', 'AUTHENTICATED')
                        AND (
                            (
                                pa.snapshot IS NOT NULL
                                AND EXISTS (
                                    SELECT 1
                                    FROM jsonb_array_elements(COALESCE(pa.snapshot -> 'skills', '[]'::jsonb)) AS skill
                                    WHERE NULLIF(skill ->> 'id', '')::bigint IN (:skillTagIds)
                                )
                            )
                            OR (
                                pa.snapshot IS NULL
                                AND EXISTS (
                                    SELECT 1
                                    FROM applicant_tag at
                                    WHERE at.applicant_user_id = pa.user_id
                                      AND at.relation_type = 'SKILL'
                                      AND at.tag_id IN (:skillTagIds)
                                )
                            )
                        )
                    )
              )
              AND (
                    :interestTagIdsEmpty = TRUE
                    OR (
                        pa.resume_visibility IN ('PUBLIC', 'AUTHENTICATED')
                        AND (
                            (
                                pa.snapshot IS NOT NULL
                                AND EXISTS (
                                    SELECT 1
                                    FROM jsonb_array_elements(COALESCE(pa.snapshot -> 'interests', '[]'::jsonb)) AS interest
                                    WHERE NULLIF(interest ->> 'id', '')::bigint IN (:interestTagIds)
                                )
                            )
                            OR (
                                pa.snapshot IS NULL
                                AND EXISTS (
                                    SELECT 1
                                    FROM applicant_tag at
                                    WHERE at.applicant_user_id = pa.user_id
                                      AND at.relation_type = 'INTEREST'
                                      AND at.tag_id IN (:interestTagIds)
                                )
                            )
                        )
                    )
              )
            ORDER BY pa.open_to_work DESC, pa.open_to_events DESC, pa.updated_at DESC NULLS LAST, pa.user_id DESC
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
            WITH public_applicant AS (
                SELECT
                    ap.user_id,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN ap.approved_public_snapshot
                        ELSE NULL
                    END AS snapshot,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'firstName', '')
                        ELSE COALESCE(ap.first_name, '')
                    END AS first_name,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'lastName', '')
                        ELSE COALESCE(ap.last_name, '')
                    END AS last_name,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'middleName', '')
                        ELSE COALESCE(ap.middle_name, '')
                    END AS middle_name,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'universityName', '')
                        ELSE COALESCE(ap.university_name, '')
                    END AS university_name,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'facultyName', '')
                        ELSE COALESCE(ap.faculty_name, '')
                    END AS faculty_name,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'studyProgram', '')
                        ELSE COALESCE(ap.study_program, '')
                    END AS study_program,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb THEN COALESCE(ap.approved_public_snapshot ->> 'about', '')
                        ELSE COALESCE(ap.about, '')
                    END AS about,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb
                            THEN NULLIF(ap.approved_public_snapshot #>> '{city,id}', '')::bigint
                        ELSE ap.city_id
                    END AS city_id,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb
                            THEN COALESCE((ap.approved_public_snapshot ->> 'openToWork')::boolean, FALSE)
                        ELSE ap.open_to_work
                    END AS open_to_work,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb
                            THEN COALESCE((ap.approved_public_snapshot ->> 'openToEvents')::boolean, FALSE)
                        ELSE ap.open_to_events
                    END AS open_to_events,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb
                            THEN COALESCE(ap.approved_public_snapshot ->> 'profileVisibility', 'PRIVATE')
                        ELSE ap.profile_visibility::text
                    END AS profile_visibility,
                    CASE
                        WHEN ap.approved_public_snapshot <> '{}'::jsonb
                            THEN COALESCE(ap.approved_public_snapshot ->> 'resumeVisibility', 'PRIVATE')
                        ELSE ap.resume_visibility::text
                    END AS resume_visibility
                FROM applicant_profile ap
                WHERE ap.user_id <> :currentUserId
                  AND (
                      ap.approved_public_snapshot <> '{}'::jsonb
                      OR ap.moderation_status = 'APPROVED'
                  )
            )
            SELECT COUNT(*)
            FROM public_applicant pa
            WHERE pa.profile_visibility IN ('PUBLIC', 'AUTHENTICATED')
              AND (
                    :search IS NULL
                    OR LOWER(pa.first_name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(pa.last_name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(pa.middle_name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(CONCAT_WS(' ', pa.first_name, pa.last_name, pa.middle_name))
                        LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(pa.university_name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(pa.faculty_name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(pa.study_program) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(pa.about) LIKE LOWER(CONCAT('%', :search, '%'))
              )
              AND (:cityId IS NULL OR pa.city_id = :cityId)
              AND (:openToWork IS NULL OR pa.open_to_work = :openToWork)
              AND (:openToEvents IS NULL OR pa.open_to_events = :openToEvents)
              AND (
                    :skillTagIdsEmpty = TRUE
                    OR (
                        pa.resume_visibility IN ('PUBLIC', 'AUTHENTICATED')
                        AND (
                            (
                                pa.snapshot IS NOT NULL
                                AND EXISTS (
                                    SELECT 1
                                    FROM jsonb_array_elements(COALESCE(pa.snapshot -> 'skills', '[]'::jsonb)) AS skill
                                    WHERE NULLIF(skill ->> 'id', '')::bigint IN (:skillTagIds)
                                )
                            )
                            OR (
                                pa.snapshot IS NULL
                                AND EXISTS (
                                    SELECT 1
                                    FROM applicant_tag at
                                    WHERE at.applicant_user_id = pa.user_id
                                      AND at.relation_type = 'SKILL'
                                      AND at.tag_id IN (:skillTagIds)
                                )
                            )
                        )
                    )
              )
              AND (
                    :interestTagIdsEmpty = TRUE
                    OR (
                        pa.resume_visibility IN ('PUBLIC', 'AUTHENTICATED')
                        AND (
                            (
                                pa.snapshot IS NOT NULL
                                AND EXISTS (
                                    SELECT 1
                                    FROM jsonb_array_elements(COALESCE(pa.snapshot -> 'interests', '[]'::jsonb)) AS interest
                                    WHERE NULLIF(interest ->> 'id', '')::bigint IN (:interestTagIds)
                                )
                            )
                            OR (
                                pa.snapshot IS NULL
                                AND EXISTS (
                                    SELECT 1
                                    FROM applicant_tag at
                                    WHERE at.applicant_user_id = pa.user_id
                                      AND at.relation_type = 'INTEREST'
                                      AND at.tag_id IN (:interestTagIds)
                                )
                            )
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
