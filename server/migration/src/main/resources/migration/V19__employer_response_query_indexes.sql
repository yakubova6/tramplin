CREATE INDEX IF NOT EXISTS idx_opportunity_response_opportunity_created_at
    ON opportunity_response (opportunity_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_applicant_tag_applicant_relation
    ON applicant_tag (applicant_user_id, relation_type, tag_id);
