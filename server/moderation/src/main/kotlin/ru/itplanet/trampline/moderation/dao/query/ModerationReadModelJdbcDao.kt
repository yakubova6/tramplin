package ru.itplanet.trampline.moderation.dao.query

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.moderation.model.response.ModerationTaskAttachmentResponse

@Repository
class ModerationReadModelJdbcDao(
    private val jdbcTemplate: NamedParameterJdbcTemplate,
    private val objectMapper: ObjectMapper,
) : ModerationReadModelDao {

    /**
     * TODO interim solution:
     * moderation reads shared DB directly only for read-side task details.
     * Replace with internal read APIs or a dedicated projection/read-model later.
     */
    override fun findCurrentEntityState(
        entityType: ModerationEntityType,
        entityId: Long,
    ): JsonNode {
        val sql = when (entityType) {
            ModerationEntityType.APPLICANT_PROFILE -> APPLICANT_PROFILE_SQL
            ModerationEntityType.EMPLOYER_PROFILE -> EMPLOYER_PROFILE_SQL
            ModerationEntityType.EMPLOYER_VERIFICATION -> EMPLOYER_VERIFICATION_SQL
            ModerationEntityType.OPPORTUNITY -> OPPORTUNITY_SQL
            ModerationEntityType.TAG -> TAG_SQL
        }

        return queryJsonOrNotFound(
            sql = sql,
            params = mapOf("id" to entityId),
            entityType = entityType,
            entityId = entityId,
        )
    }

    override fun findTaskAttachments(taskId: Long): List<ModerationTaskAttachmentResponse> {
        return jdbcTemplate.query(
            ATTACHMENTS_SQL,
            mapOf("taskId" to taskId),
        ) { rs, _ ->
            ModerationTaskAttachmentResponse(
                id = rs.getLong("id"),
                fileId = rs.getLong("file_id"),
                originalFileName = rs.getString("original_file_name"),
                mediaType = rs.getString("media_type"),
                sizeBytes = rs.getLong("size_bytes"),
                visibility = rs.getString("visibility"),
                status = rs.getString("status"),
                attachmentRole = rs.getString("attachment_role"),
                sortOrder = rs.getInt("sort_order"),
            )
        }
    }

    private fun queryJsonOrNotFound(
        sql: String,
        params: Map<String, Any>,
        entityType: ModerationEntityType,
        entityId: Long,
    ): JsonNode {
        val json = jdbcTemplate.query(
            sql,
            params,
        ) { rs, _ -> rs.getString("data") }.firstOrNull()

        return if (json.isNullOrBlank()) {
            objectMapper.createObjectNode()
                .put("notFound", true)
                .put("entityType", entityType.name)
                .put("entityId", entityId)
        } else {
            objectMapper.readTree(json)
        }
    }

    private companion object {

        val APPLICANT_PROFILE_SQL = """
            select jsonb_build_object(
                'userId', ap.user_id,
                'user', jsonb_build_object(
                    'id', u.id,
                    'email', u.email,
                    'displayName', u.display_name,
                    'role', u.role
                ),
                'firstName', ap.first_name,
                'lastName', ap.last_name,
                'middleName', ap.middle_name,
                'universityName', ap.university_name,
                'facultyName', ap.faculty_name,
                'studyProgram', ap.study_program,
                'course', ap.course,
                'graduationYear', ap.graduation_year,
                'about', ap.about,
                'resumeText', ap.resume_text,
                'portfolioLinks', coalesce(ap.portfolio_links, '[]'::jsonb),
                'contactLinks', coalesce(ap.contact_links, '[]'::jsonb),
                'profileVisibility', ap.profile_visibility,
                'resumeVisibility', ap.resume_visibility,
                'applicationsVisibility', ap.applications_visibility,
                'contactsVisibility', ap.contacts_visibility,
                'openToWork', ap.open_to_work,
                'openToEvents', ap.open_to_events,
                'moderationStatus', ap.moderation_status,
                'city', case
                    when c.id is null then null
                    else jsonb_build_object(
                        'id', c.id,
                        'name', c.name,
                        'regionName', c.region_name,
                        'countryCode', c.country_code
                    )
                end,
                'skillTags', coalesce((
                    select jsonb_agg(
                        jsonb_build_object(
                            'id', t.id,
                            'name', t.name,
                            'category', t.category
                        )
                        order by t.name
                    )
                    from applicant_tag apt
                    join tag t on t.id = apt.tag_id
                    where apt.applicant_user_id = ap.user_id
                      and apt.relation_type = 'SKILL'
                ), '[]'::jsonb),
                'interestTags', coalesce((
                    select jsonb_agg(
                        jsonb_build_object(
                            'id', t.id,
                            'name', t.name,
                            'category', t.category
                        )
                        order by t.name
                    )
                    from applicant_tag apt
                    join tag t on t.id = apt.tag_id
                    where apt.applicant_user_id = ap.user_id
                      and apt.relation_type = 'INTEREST'
                ), '[]'::jsonb),
                'createdAt', ap.created_at,
                'updatedAt', ap.updated_at
            )::text as data
            from applicant_profile ap
            join users u on u.id = ap.user_id
            left join city c on c.id = ap.city_id
            where ap.user_id = :id
        """.trimIndent()

        val EMPLOYER_PROFILE_SQL = """
            select jsonb_build_object(
                'userId', ep.user_id,
                'user', jsonb_build_object(
                    'id', u.id,
                    'email', u.email,
                    'displayName', u.display_name,
                    'role', u.role
                ),
                'companyName', ep.company_name,
                'legalName', ep.legal_name,
                'inn', ep.inn,
                'description', ep.description,
                'industry', ep.industry,
                'websiteUrl', ep.website_url,
                'socialLinks', coalesce(ep.social_links, '[]'::jsonb),
                'publicContacts', coalesce(ep.public_contacts, '{}'::jsonb),
                'companySize', ep.company_size,
                'foundedYear', ep.founded_year,
                'verificationStatus', ep.verification_status,
                'city', case
                    when c.id is null then null
                    else jsonb_build_object(
                        'id', c.id,
                        'name', c.name,
                        'regionName', c.region_name,
                        'countryCode', c.country_code
                    )
                end,
                'location', case
                    when l.id is null then null
                    else jsonb_build_object(
                        'id', l.id,
                        'title', l.title,
                        'addressLine', l.address_line,
                        'addressLine2', l.address_line2,
                        'postalCode', l.postal_code,
                        'latitude', l.latitude,
                        'longitude', l.longitude
                    )
                end,
                'latestVerification', (
                    select jsonb_build_object(
                        'id', ev.id,
                        'status', ev.status,
                        'verificationMethod', ev.verification_method,
                        'submittedAt', ev.submitted_at,
                        'reviewedAt', ev.reviewed_at
                    )
                    from employer_verification ev
                    where ev.employer_user_id = ep.user_id
                    order by ev.created_at desc
                    limit 1
                ),
                'createdAt', ep.created_at,
                'updatedAt', ep.updated_at
            )::text as data
            from employer_profile ep
            join users u on u.id = ep.user_id
            left join city c on c.id = ep.city_id
            left join location l on l.id = ep.location_id
            where ep.user_id = :id
        """.trimIndent()

        val EMPLOYER_VERIFICATION_SQL = """
            select jsonb_build_object(
                'id', ev.id,
                'employerUserId', ev.employer_user_id,
                'companyName', ep.company_name,
                'status', ev.status,
                'verificationMethod', ev.verification_method,
                'corporateEmail', ev.corporate_email,
                'inn', ev.inn,
                'professionalLinks', coalesce(ev.professional_links, '[]'::jsonb),
                'submittedComment', ev.submitted_comment,
                'reviewComment', ev.review_comment,
                'submittedAt', ev.submitted_at,
                'reviewedAt', ev.reviewed_at,
                'reviewedByUserId', ev.reviewed_by_user_id,
                'createdAt', ev.created_at,
                'updatedAt', ev.updated_at
            )::text as data
            from employer_verification ev
            left join employer_profile ep on ep.user_id = ev.employer_user_id
            where ev.id = :id
        """.trimIndent()

        val OPPORTUNITY_SQL = """
            select jsonb_build_object(
                'id', o.id,
                'employerUserId', o.employer_user_id,
                'title', o.title,
                'shortDescription', o.short_description,
                'fullDescription', o.full_description,
                'requirements', o.requirements,
                'companyName', o.company_name,
                'type', o.type,
                'workFormat', o.work_format,
                'employmentType', o.employment_type,
                'grade', o.grade,
                'salaryFrom', o.salary_from,
                'salaryTo', o.salary_to,
                'salaryCurrency', o.salary_currency,
                'publishedAt', o.published_at,
                'expiresAt', o.expires_at,
                'eventDate', o.event_date,
                'contactInfo', coalesce(o.contact_info, '{}'::jsonb),
                'moderationComment', o.moderation_comment,
                'status', o.status,
                'city', case
                    when c.id is null then null
                    else jsonb_build_object(
                        'id', c.id,
                        'name', c.name,
                        'regionName', c.region_name,
                        'countryCode', c.country_code
                    )
                end,
                'location', case
                    when l.id is null then null
                    else jsonb_build_object(
                        'id', l.id,
                        'title', l.title,
                        'addressLine', l.address_line,
                        'addressLine2', l.address_line2,
                        'postalCode', l.postal_code,
                        'latitude', l.latitude,
                        'longitude', l.longitude
                    )
                end,
                'tags', coalesce((
                    select jsonb_agg(
                        jsonb_build_object(
                            'id', t.id,
                            'name', t.name,
                            'category', t.category
                        )
                        order by t.name
                    )
                    from opportunity_tag ot
                    join tag t on t.id = ot.tag_id
                    where ot.opportunity_id = o.id
                ), '[]'::jsonb),
                'resourceLinks', coalesce((
                    select jsonb_agg(
                        jsonb_build_object(
                            'sortOrder', rl.sort_order,
                            'label', rl.label,
                            'linkType', rl.link_type,
                            'url', rl.url
                        )
                        order by rl.sort_order
                    )
                    from opportunity_resource_link rl
                    where rl.opportunity_id = o.id
                ), '[]'::jsonb),
                'createdAt', o.created_at,
                'updatedAt', o.updated_at
            )::text as data
            from opportunity o
            left join city c on c.id = o.city_id
            left join location l on l.id = o.location_id
            where o.id = :id
        """.trimIndent()

        val TAG_SQL = """
            select jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'category', t.category,
                'createdByType', t.created_by_type,
                'createdByUserId', t.created_by_user_id,
                'moderationStatus', t.moderation_status,
                'isActive', t.is_active,
                'createdAt', t.created_at,
                'updatedAt', t.updated_at
            )::text as data
            from tag t
            where t.id = :id
        """.trimIndent()

        val ATTACHMENTS_SQL = """
            select
                fa_att.id,
                fa_att.file_id,
                fa.original_file_name,
                fa.media_type,
                fa.size_bytes,
                fa.visibility,
                fa.status,
                fa_att.attachment_role,
                fa_att.sort_order
            from file_attachment fa_att
            join file_asset fa on fa.id = fa_att.file_id
            where fa_att.entity_type = 'MODERATION_TASK'
              and fa_att.entity_id = :taskId
            order by fa_att.sort_order asc, fa_att.id asc
        """.trimIndent()
    }
}
