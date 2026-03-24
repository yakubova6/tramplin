ALTER TABLE applicant_profile
    ALTER COLUMN first_name DROP NOT NULL;

ALTER TABLE applicant_profile
    ALTER COLUMN last_name DROP NOT NULL;

ALTER TABLE employer_profile
    ALTER COLUMN company_name DROP NOT NULL;
