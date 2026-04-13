ALTER TABLE applicant_profile
    ADD COLUMN IF NOT EXISTS approved_public_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE employer_profile
    ADD COLUMN IF NOT EXISTS approved_public_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE applicant_profile ap
SET approved_public_snapshot = jsonb_build_object(
        'userId', ap.user_id,
        'firstName', ap.first_name,
        'lastName', ap.last_name,
        'middleName', ap.middle_name,
        'universityName', ap.university_name,
        'facultyName', ap.faculty_name,
        'studyProgram', ap.study_program,
        'course', ap.course,
        'graduationYear', ap.graduation_year,
        'city', CASE
                    WHEN c.id IS NULL THEN NULL
                    ELSE jsonb_build_object(
                            'id', c.id,
                            'name', c.name,
                            'regionName', c.region_name,
                            'countryCode', c.country_code,
                            'latitude', c.latitude,
                            'longitude', c.longitude
                         )
            END,
        'about', ap.about,
        'resumeText', ap.resume_text,
        'portfolioLinks', COALESCE(ap.portfolio_links, '[]'::jsonb),
        'contactLinks', COALESCE(ap.contact_links, '[]'::jsonb),
        'profileVisibility', ap.profile_visibility,
        'resumeVisibility', ap.resume_visibility,
        'applicationsVisibility', ap.applications_visibility,
        'contactsVisibility', ap.contacts_visibility,
        'openToWork', ap.open_to_work,
        'openToEvents', ap.open_to_events,
        'moderationStatus', 'APPROVED',
        'skills', COALESCE(
                (
                    SELECT jsonb_agg(
                                   jsonb_build_object(
                                           'id', t.id,
                                           'name', t.name,
                                           'category', t.category
                                   )
                                       ORDER BY LOWER(t.name), t.id
                           )
                    FROM applicant_tag at
                JOIN tag t
                ON t.id = at.tag_id
                WHERE at.applicant_user_id = ap.user_id
                    AND at.relation_type = 'SKILL'
                    AND t.is_active = TRUE
                    AND t.moderation_status = 'APPROVED'
            ),
            '[]'::jsonb
        ),
        'interests', COALESCE(
                (
                    SELECT jsonb_agg(
                                   jsonb_build_object(
                                           'id', t.id,
                                           'name', t.name,
                                           'category', t.category
                                   )
                                       ORDER BY LOWER(t.name), t.id
                           )
                    FROM applicant_tag at
                JOIN tag t
                ON t.id = at.tag_id
                WHERE at.applicant_user_id = ap.user_id
                    AND at.relation_type = 'INTEREST'
                    AND t.is_active = TRUE
                    AND t.moderation_status = 'APPROVED'
            ),
            '[]'::jsonb
        )
                               )
    FROM city c
WHERE ap.city_id = c.id
  AND ap.moderation_status = 'APPROVED'
  AND ap.approved_public_snapshot = '{}'::jsonb;

UPDATE applicant_profile ap
SET approved_public_snapshot = jsonb_build_object(
        'userId', ap.user_id,
        'firstName', ap.first_name,
        'lastName', ap.last_name,
        'middleName', ap.middle_name,
        'universityName', ap.university_name,
        'facultyName', ap.faculty_name,
        'studyProgram', ap.study_program,
        'course', ap.course,
        'graduationYear', ap.graduation_year,
        'city', NULL,
        'about', ap.about,
        'resumeText', ap.resume_text,
        'portfolioLinks', COALESCE(ap.portfolio_links, '[]'::jsonb),
        'contactLinks', COALESCE(ap.contact_links, '[]'::jsonb),
        'profileVisibility', ap.profile_visibility,
        'resumeVisibility', ap.resume_visibility,
        'applicationsVisibility', ap.applications_visibility,
        'contactsVisibility', ap.contacts_visibility,
        'openToWork', ap.open_to_work,
        'openToEvents', ap.open_to_events,
        'moderationStatus', 'APPROVED',
        'skills', COALESCE(
                (
                    SELECT jsonb_agg(
                                   jsonb_build_object(
                                           'id', t.id,
                                           'name', t.name,
                                           'category', t.category
                                   )
                                       ORDER BY LOWER(t.name), t.id
                           )
                    FROM applicant_tag at
                JOIN tag t
                ON t.id = at.tag_id
                WHERE at.applicant_user_id = ap.user_id
                    AND at.relation_type = 'SKILL'
                    AND t.is_active = TRUE
                    AND t.moderation_status = 'APPROVED'
            ),
            '[]'::jsonb
        ),
        'interests', COALESCE(
                (
                    SELECT jsonb_agg(
                                   jsonb_build_object(
                                           'id', t.id,
                                           'name', t.name,
                                           'category', t.category
                                   )
                                       ORDER BY LOWER(t.name), t.id
                           )
                    FROM applicant_tag at
                JOIN tag t
                ON t.id = at.tag_id
                WHERE at.applicant_user_id = ap.user_id
                    AND at.relation_type = 'INTEREST'
                    AND t.is_active = TRUE
                    AND t.moderation_status = 'APPROVED'
            ),
            '[]'::jsonb
        )
                               )
WHERE ap.city_id IS NULL
  AND ap.moderation_status = 'APPROVED'
  AND ap.approved_public_snapshot = '{}'::jsonb;

UPDATE employer_profile ep
SET approved_public_snapshot = jsonb_build_object(
        'userId', ep.user_id,
        'companyName', ep.company_name,
        'legalName', NULL,
        'inn', NULL,
        'description', ep.description,
        'industry', ep.industry,
        'websiteUrl', ep.website_url,
        'city', CASE
                    WHEN ep.city_id IS NULL THEN NULL
                    ELSE (
                        SELECT jsonb_build_object(
                                       'id', c.id,
                                       'name', c.name,
                                       'regionName', c.region_name,
                                       'countryCode', c.country_code,
                                       'latitude', c.latitude,
                                       'longitude', c.longitude
                               )
                        FROM city c
                        WHERE c.id = ep.city_id
                    )
            END,
        'location', CASE
                        WHEN ep.location_id IS NULL THEN NULL
                        ELSE (
                            SELECT jsonb_build_object(
                                           'id', l.id,
                                           'cityId', l.city_id,
                                           'city', CASE
                                                       WHEN lc.id IS NULL THEN NULL
                                                       ELSE jsonb_build_object(
                                                               'id', lc.id,
                                                               'name', lc.name,
                                                               'regionName', lc.region_name,
                                                               'countryCode', lc.country_code,
                                                               'latitude', lc.latitude,
                                                               'longitude', lc.longitude
                                                            )
                                               END,
                                           'title', l.title,
                                           'addressLine', l.address_line,
                                           'addressLine2', l.address_line2,
                                           'postalCode', l.postal_code,
                                           'latitude', l.latitude,
                                           'longitude', l.longitude
                                   )
                            FROM location l
                                     LEFT JOIN city lc
                                               ON lc.id = l.city_id
                            WHERE l.id = ep.location_id
                        )
            END,
        'companySize', ep.company_size,
        'foundedYear', ep.founded_year,
        'socialLinks', COALESCE(ep.social_links, '[]'::jsonb),
        'publicContacts', COALESCE(ep.public_contacts, '[]'::jsonb),
        'verificationStatus', ep.verification_status,
        'moderationStatus', 'APPROVED',
        'logo', NULL
                               )
WHERE ep.moderation_status = 'APPROVED'
  AND ep.approved_public_snapshot = '{}'::jsonb;
