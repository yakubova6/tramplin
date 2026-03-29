package ru.itplanet.trampline.interaction.dao

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus
import ru.itplanet.trampline.interaction.model.enums.EmployerResponseSortBy
import ru.itplanet.trampline.interaction.model.enums.SortDirection
import ru.itplanet.trampline.interaction.model.request.GetEmployerResponseListRequest
import ru.itplanet.trampline.interaction.model.response.ApplicantResponseSummary
import ru.itplanet.trampline.interaction.model.response.EmployerOpportunityResponseItem
import ru.itplanet.trampline.interaction.model.response.EmployerResponsePage
import java.time.OffsetDateTime

@Repository
class EmployerResponseQueryDaoImpl(
    private val jdbcTemplate: NamedParameterJdbcTemplate,
) : EmployerResponseQueryDao {

    override fun findResponses(
        employerUserId: Long,
        request: GetEmployerResponseListRequest,
    ): EmployerResponsePage<EmployerOpportunityResponseItem> {
        val params = MapSqlParameterSource()
            .addValue("employerUserId", employerUserId)
            .addValue("limit", request.limit)
            .addValue("offset", request.offset)

        val whereClause = buildWhereClause(request, params)

        val total = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM opportunity_response r
            JOIN opportunity o ON o.id = r.opportunity_id
            JOIN applicant_profile ap ON ap.user_id = r.applicant_user_id
            JOIN users u ON u.id = ap.user_id
            $whereClause
            """.trimIndent(),
            params,
            Long::class.java,
        ) ?: 0L

        val sql = """
            SELECT
                r.id,
                r.opportunity_id,
                o.title AS opportunity_title,
                r.status,
                r.employer_comment,
                r.applicant_comment,
                r.cover_letter,
                r.resume_file_id,
                r.created_at,
                ap.user_id AS applicant_user_id,
                u.display_name,
                ap.first_name,
                ap.middle_name,
                ap.last_name,
                ap.university_name,
                ap.course,
                ap.graduation_year,
                ap.open_to_work,
                ap.open_to_events,
                COALESCE((
                    SELECT string_agg(skill_name.name, '|||')
                    FROM (
                        SELECT DISTINCT t.name
                        FROM applicant_tag at
                        JOIN tag t ON t.id = at.tag_id
                        WHERE at.applicant_user_id = ap.user_id
                          AND at.relation_type = 'SKILL'
                        ORDER BY t.name
                        LIMIT 10
                    ) skill_name
                ), '') AS skills
            FROM opportunity_response r
            JOIN opportunity o ON o.id = r.opportunity_id
            JOIN applicant_profile ap ON ap.user_id = r.applicant_user_id
            JOIN users u ON u.id = ap.user_id
            $whereClause
            ${buildOrderBy(request)}
            LIMIT :limit
            OFFSET :offset
        """.trimIndent()

        val items = jdbcTemplate.query(sql, params) { rs, _ ->
            val firstName = rs.getString("first_name")
            val middleName = rs.getString("middle_name")
            val lastName = rs.getString("last_name")

            EmployerOpportunityResponseItem(
                id = rs.getLong("id"),
                opportunityId = rs.getLong("opportunity_id"),
                opportunityTitle = rs.getString("opportunity_title"),
                applicant = ApplicantResponseSummary(
                    applicantUserId = rs.getLong("applicant_user_id"),
                    displayName = rs.getString("display_name"),
                    fullName = buildFullName(firstName, middleName, lastName),
                    universityName = rs.getString("university_name"),
                    course = rs.getObject("course")?.let { (it as Number).toShort() },
                    graduationYear = rs.getObject("graduation_year")?.let { (it as Number).toShort() },
                    openToWork = rs.getBoolean("open_to_work"),
                    openToEvents = rs.getBoolean("open_to_events"),
                    skills = parseSkills(rs.getString("skills")),
                ),
                status = OpportunityResponseStatus.valueOf(rs.getString("status")),
                employerComment = rs.getString("employer_comment"),
                applicantComment = rs.getString("applicant_comment"),
                coverLetter = rs.getString("cover_letter"),
                resumeFileId = rs.getObject("resume_file_id")?.let { (it as Number).toLong() },
                createdAt = rs.getObject("created_at", OffsetDateTime::class.java),
            )
        }

        return EmployerResponsePage(
            items = items,
            limit = request.limit,
            offset = request.offset,
            total = total,
        )
    }

    override fun findOpportunityEmployerUserId(opportunityId: Long): Long? {
        return jdbcTemplate.query(
            """
            SELECT employer_user_id
            FROM opportunity
            WHERE id = :opportunityId
            """.trimIndent(),
            MapSqlParameterSource("opportunityId", opportunityId),
        ) { rs, _ -> rs.getLong("employer_user_id") }
            .firstOrNull()
    }

    private fun buildWhereClause(
        request: GetEmployerResponseListRequest,
        params: MapSqlParameterSource,
    ): String {
        val conditions = mutableListOf<String>()

        conditions += "o.employer_user_id = :employerUserId"

        request.opportunityId?.let {
            conditions += "r.opportunity_id = :opportunityId"
            params.addValue("opportunityId", it)
        }

        request.status?.let {
            conditions += "r.status = :status"
            params.addValue("status", it.name)
        }

        normalizeSearch(request.search)?.let { normalizedSearch ->
            params.addValue("searchPattern", "%${escapeLike(normalizedSearch.lowercase())}%")

            conditions += """
                (
                    LOWER(COALESCE(u.display_name, '')) LIKE :searchPattern ESCAPE '\'
                    OR LOWER(COALESCE(ap.first_name, '')) LIKE :searchPattern ESCAPE '\'
                    OR LOWER(COALESCE(ap.last_name, '')) LIKE :searchPattern ESCAPE '\'
                    OR LOWER(COALESCE(ap.middle_name, '')) LIKE :searchPattern ESCAPE '\'
                    OR LOWER(TRIM(CONCAT_WS(' ', ap.first_name, ap.middle_name, ap.last_name))) LIKE :searchPattern ESCAPE '\'
                    OR LOWER(COALESCE(ap.university_name, '')) LIKE :searchPattern ESCAPE '\'
                    OR LOWER(COALESCE(ap.faculty_name, '')) LIKE :searchPattern ESCAPE '\'
                    OR LOWER(COALESCE(ap.study_program, '')) LIKE :searchPattern ESCAPE '\'
                    OR EXISTS (
                        SELECT 1
                        FROM applicant_tag at
                        JOIN tag t ON t.id = at.tag_id
                        WHERE at.applicant_user_id = ap.user_id
                          AND at.relation_type = 'SKILL'
                          AND LOWER(t.name) LIKE :searchPattern ESCAPE '\'
                    )
                )
            """.trimIndent()
        }

        return buildString {
            append("WHERE ")
            append(conditions.joinToString("\n  AND "))
        }
    }

    private fun buildOrderBy(
        request: GetEmployerResponseListRequest,
    ): String {
        val direction = when (request.sortDirection) {
            SortDirection.ASC -> "ASC"
            SortDirection.DESC -> "DESC"
        }

        return when (request.sortBy) {
            EmployerResponseSortBy.CREATED_AT -> "ORDER BY r.created_at $direction, r.id $direction"
        }
    }

    private fun normalizeSearch(
        value: String?,
    ): String? {
        return value?.trim()?.takeIf { it.isNotEmpty() }
    }

    private fun escapeLike(
        value: String,
    ): String {
        return value
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
    }

    private fun parseSkills(
        raw: String?,
    ): List<String> {
        return raw
            ?.split("|||")
            ?.map { it.trim() }
            ?.filter { it.isNotEmpty() }
            ?: emptyList()
    }

    private fun buildFullName(
        firstName: String?,
        middleName: String?,
        lastName: String?,
    ): String? {
        return listOfNotNull(
            firstName?.takeIf { it.isNotBlank() },
            middleName?.takeIf { it.isNotBlank() },
            lastName?.takeIf { it.isNotBlank() },
        ).joinToString(" ").ifBlank { null }
    }
}
