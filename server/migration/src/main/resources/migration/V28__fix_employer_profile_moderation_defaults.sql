ALTER TABLE employer_profile
    ALTER COLUMN moderation_status SET DEFAULT 'DRAFT';

ALTER TABLE employer_profile
    ALTER COLUMN company_moderation_status SET DEFAULT 'DRAFT';
