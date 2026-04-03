UPDATE applicant_profile
SET portfolio_links = CASE
      WHEN jsonb_typeof(portfolio_links) <> 'array' THEN '[]'::jsonb
      ELSE (
          SELECT COALESCE(jsonb_agg(normalized_item), '[]'::jsonb)
          FROM (
                   SELECT CASE
                          WHEN jsonb_typeof(item) = 'string' THEN
                              jsonb_build_object(
                                      'label', NULL,
                                      'url', item #>> '{}'
                              )
                          WHEN jsonb_typeof(item) = 'object' THEN
                              jsonb_build_object(
                                      'label', NULLIF(BTRIM(item ->> 'label'), ''),
                                      'url', NULLIF(BTRIM(item ->> 'url'), '')
                              )
                          ELSE NULL
                          END AS normalized_item
                   FROM jsonb_array_elements(portfolio_links) AS item
               ) t
          WHERE normalized_item IS NOT NULL
            AND COALESCE(normalized_item ->> 'url', '') <> ''
      )
END;

UPDATE applicant_profile
SET contact_links = CASE
        WHEN jsonb_typeof(contact_links) <> 'array' THEN '[]'::jsonb
        ELSE (
            SELECT COALESCE(jsonb_agg(normalized_item), '[]'::jsonb)
            FROM (
                     SELECT CASE
                            WHEN jsonb_typeof(item) = 'string' THEN
                                jsonb_build_object(
                                        'type', 'OTHER',
                                        'value', item #>> '{}',
                                        'label', NULL
                                )
                            WHEN jsonb_typeof(item) = 'object' THEN
                                jsonb_build_object(
                                        'type', COALESCE(NULLIF(UPPER(BTRIM(item ->> 'type')), ''), 'OTHER'),
                                        'value', NULLIF(BTRIM(COALESCE(item ->> 'value', item ->> 'url')), ''),
                                        'label', NULLIF(BTRIM(item ->> 'label'), '')
                                )
                            ELSE NULL
                            END AS normalized_item
                     FROM jsonb_array_elements(contact_links) AS item
                 ) t
            WHERE normalized_item IS NOT NULL
              AND COALESCE(normalized_item ->> 'value', '') <> ''
        )
END;

UPDATE employer_profile
SET social_links = CASE
       WHEN jsonb_typeof(social_links) <> 'array' THEN '[]'::jsonb
       ELSE (
           SELECT COALESCE(jsonb_agg(normalized_item), '[]'::jsonb)
           FROM (
                    SELECT CASE
                           WHEN jsonb_typeof(item) = 'string' THEN
                               jsonb_build_object(
                                       'label', NULL,
                                       'url', item #>> '{}'
                               )
                           WHEN jsonb_typeof(item) = 'object' THEN
                               jsonb_build_object(
                                       'label', NULLIF(BTRIM(item ->> 'label'), ''),
                                       'url', NULLIF(BTRIM(item ->> 'url'), '')
                               )
                           ELSE NULL
                           END AS normalized_item
                    FROM jsonb_array_elements(social_links) AS item
                ) t
           WHERE normalized_item IS NOT NULL
             AND COALESCE(normalized_item ->> 'url', '') <> ''
       )
END;

UPDATE employer_profile
SET public_contacts = CASE
          WHEN jsonb_typeof(public_contacts) = 'object' THEN (
              SELECT COALESCE(jsonb_agg(
                                      jsonb_build_object(
                                              'type', UPPER(BTRIM(key)),
                                              'value', NULLIF(BTRIM(value), ''),
                                              'label', NULL
                                      )
                              ), '[]'::jsonb)
              FROM jsonb_each_text(public_contacts)
              WHERE NULLIF(BTRIM(value), '') IS NOT NULL
          )
          WHEN jsonb_typeof(public_contacts) = 'array' THEN (
              SELECT COALESCE(jsonb_agg(normalized_item), '[]'::jsonb)
              FROM (
                       SELECT CASE
                              WHEN jsonb_typeof(item) = 'object' THEN
                                  jsonb_build_object(
                                          'type', COALESCE(NULLIF(UPPER(BTRIM(item ->> 'type')), ''), 'OTHER'),
                                          'value', NULLIF(BTRIM(COALESCE(item ->> 'value', item ->> 'url')), ''),
                                          'label', NULLIF(BTRIM(item ->> 'label'), '')
                                  )
                              WHEN jsonb_typeof(item) = 'string' THEN
                                  jsonb_build_object(
                                          'type', 'OTHER',
                                          'value', item #>> '{}',
                                          'label', NULL
                                  )
                              ELSE NULL
                              END AS normalized_item
                       FROM jsonb_array_elements(public_contacts) AS item
                   ) t
              WHERE normalized_item IS NOT NULL
                AND COALESCE(normalized_item ->> 'value', '') <> ''
          )
          ELSE '[]'::jsonb
END;

ALTER TABLE employer_profile
    ALTER COLUMN public_contacts SET DEFAULT '[]'::jsonb;
