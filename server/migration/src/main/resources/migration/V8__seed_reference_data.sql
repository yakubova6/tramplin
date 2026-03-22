INSERT INTO tag (name, category, created_by_type, moderation_status, is_active)
VALUES
    ('Java', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('Kotlin', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('Python', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('SQL', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('Spring', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('PostgreSQL', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('React', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('TypeScript', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('JavaScript', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('Docker', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('Kubernetes', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('Git', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('Linux', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('Go', 'TECH', 'SYSTEM', 'APPROVED', TRUE),
    ('C#', 'TECH', 'SYSTEM', 'APPROVED', TRUE),

    ('Intern', 'GRADE', 'SYSTEM', 'APPROVED', TRUE),
    ('Junior', 'GRADE', 'SYSTEM', 'APPROVED', TRUE),
    ('Middle', 'GRADE', 'SYSTEM', 'APPROVED', TRUE),
    ('Senior', 'GRADE', 'SYSTEM', 'APPROVED', TRUE),

    ('Full-time', 'EMPLOYMENT_TYPE', 'SYSTEM', 'APPROVED', TRUE),
    ('Part-time', 'EMPLOYMENT_TYPE', 'SYSTEM', 'APPROVED', TRUE),
    ('Project', 'EMPLOYMENT_TYPE', 'SYSTEM', 'APPROVED', TRUE),

    ('Backend', 'DIRECTION', 'SYSTEM', 'APPROVED', TRUE),
    ('Frontend', 'DIRECTION', 'SYSTEM', 'APPROVED', TRUE),
    ('Mobile', 'DIRECTION', 'SYSTEM', 'APPROVED', TRUE),
    ('DevOps', 'DIRECTION', 'SYSTEM', 'APPROVED', TRUE),
    ('Data Science', 'DIRECTION', 'SYSTEM', 'APPROVED', TRUE),
    ('QA', 'DIRECTION', 'SYSTEM', 'APPROVED', TRUE),
    ('Analytics', 'DIRECTION', 'SYSTEM', 'APPROVED', TRUE),
    ('Machine Learning', 'DIRECTION', 'SYSTEM', 'APPROVED', TRUE)
    ON CONFLICT (name, category) DO NOTHING;

-- Временный системный администратор.
-- тут поменять на реальные данные
INSERT INTO users (email, password_hash, display_name, role, status, email_verified)
VALUES (
       'admin@trampline.local',
       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
       'Администратор',
       'ADMIN',
       'ACTIVE',
       TRUE
   )
ON CONFLICT (email) DO NOTHING;
