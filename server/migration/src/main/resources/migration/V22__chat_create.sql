CREATE TABLE IF NOT EXISTS chat_dialog (
    id BIGSERIAL PRIMARY KEY,
    opportunity_response_id BIGINT NOT NULL REFERENCES opportunity_response(id) ON DELETE CASCADE,
    opportunity_id BIGINT NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
    applicant_user_id BIGINT NOT NULL REFERENCES applicant_profile(user_id) ON DELETE CASCADE,
    employer_user_id BIGINT NOT NULL REFERENCES employer_profile(user_id) ON DELETE CASCADE,
    opportunity_title_snapshot VARCHAR(200) NOT NULL,
    company_name_snapshot VARCHAR(255) NOT NULL,
    applicant_name_snapshot VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    last_message_id BIGINT,
    last_message_preview VARCHAR(300),
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_chat_dialog_opportunity_response UNIQUE (opportunity_response_id),
    CONSTRAINT chk_chat_dialog_status
    CHECK (status IN ('OPEN', 'CLOSED')),
    CONSTRAINT chk_chat_dialog_participants_different
    CHECK (applicant_user_id <> employer_user_id)
    );

CREATE TABLE IF NOT EXISTS chat_message (
    id BIGSERIAL PRIMARY KEY,
    dialog_id BIGINT NOT NULL REFERENCES chat_dialog(id) ON DELETE CASCADE,
    sender_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_role VARCHAR(32) NOT NULL,
    message_type VARCHAR(16) NOT NULL DEFAULT 'TEXT',
    body TEXT NOT NULL,
    client_message_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uk_chat_message_client_message
    UNIQUE (dialog_id, sender_user_id, client_message_id),
    CONSTRAINT chk_chat_message_sender_role
    CHECK (sender_role IN ('APPLICANT', 'EMPLOYER')),
    CONSTRAINT chk_chat_message_type
    CHECK (message_type IN ('TEXT')),
    CONSTRAINT chk_chat_message_body_not_blank
    CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
    CONSTRAINT chk_chat_message_client_message_id_not_blank
    CHECK (char_length(btrim(client_message_id)) BETWEEN 1 AND 100)
    );

CREATE TABLE IF NOT EXISTS chat_participant_state (
    dialog_id BIGINT NOT NULL REFERENCES chat_dialog(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id BIGINT REFERENCES chat_message(id) ON DELETE SET NULL,
    last_read_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (dialog_id, user_id)
    );

ALTER TABLE chat_dialog
    ADD CONSTRAINT fk_chat_dialog_last_message
        FOREIGN KEY (last_message_id)
            REFERENCES chat_message(id)
            ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_dialog_applicant_last_message
    ON chat_dialog (applicant_user_id, last_message_at DESC NULLS LAST, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_dialog_employer_last_message
    ON chat_dialog (employer_user_id, last_message_at DESC NULLS LAST, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_dialog_opportunity_id
    ON chat_dialog (opportunity_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_dialog_id_desc
    ON chat_message (dialog_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_message_dialog_created_at_desc
    ON chat_message (dialog_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_participant_state_user_last_read
    ON chat_participant_state (user_id, last_read_at DESC NULLS LAST);

CREATE OR REPLACE FUNCTION validate_chat_dialog_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
response_opportunity_id BIGINT;
    response_applicant_user_id BIGINT;
    actual_employer_user_id BIGINT;
BEGIN
SELECT
    opportunity_id,
    applicant_user_id
INTO
    response_opportunity_id,
    response_applicant_user_id
FROM opportunity_response
WHERE id = NEW.opportunity_response_id;

IF response_opportunity_id IS NULL THEN
        RAISE EXCEPTION 'Opportunity response % does not exist', NEW.opportunity_response_id;
END IF;

    IF NEW.opportunity_id <> response_opportunity_id THEN
        RAISE EXCEPTION
            'Chat dialog opportunity_id % does not match opportunity_response.opportunity_id %',
            NEW.opportunity_id,
            response_opportunity_id;
END IF;

    IF NEW.applicant_user_id <> response_applicant_user_id THEN
        RAISE EXCEPTION
            'Chat dialog applicant_user_id % does not match opportunity_response.applicant_user_id %',
            NEW.applicant_user_id,
            response_applicant_user_id;
END IF;

SELECT employer_user_id
INTO actual_employer_user_id
FROM opportunity
WHERE id = NEW.opportunity_id;

IF actual_employer_user_id IS NULL THEN
        RAISE EXCEPTION 'Opportunity % does not exist', NEW.opportunity_id;
END IF;

    IF NEW.employer_user_id <> actual_employer_user_id THEN
        RAISE EXCEPTION
            'Chat dialog employer_user_id % does not match opportunity.employer_user_id %',
            NEW.employer_user_id,
            actual_employer_user_id;
END IF;

RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_chat_dialog_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
actual_dialog_id BIGINT;
BEGIN
    IF NEW.last_message_id IS NULL THEN
        RETURN NEW;
END IF;

SELECT dialog_id
INTO actual_dialog_id
FROM chat_message
WHERE id = NEW.last_message_id;

IF actual_dialog_id IS NULL THEN
        RAISE EXCEPTION 'Chat message % does not exist', NEW.last_message_id;
END IF;

    IF actual_dialog_id <> NEW.id THEN
        RAISE EXCEPTION
            'last_message_id % does not belong to dialog %',
            NEW.last_message_id,
            NEW.id;
END IF;

RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_chat_message_sender()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
dialog_applicant_user_id BIGINT;
    dialog_employer_user_id BIGINT;
BEGIN
SELECT
    applicant_user_id,
    employer_user_id
INTO
    dialog_applicant_user_id,
    dialog_employer_user_id
FROM chat_dialog
WHERE id = NEW.dialog_id;

IF dialog_applicant_user_id IS NULL THEN
        RAISE EXCEPTION 'Chat dialog % does not exist', NEW.dialog_id;
END IF;

    IF NEW.sender_user_id NOT IN (dialog_applicant_user_id, dialog_employer_user_id) THEN
        RAISE EXCEPTION
            'User % is not a participant of dialog %',
            NEW.sender_user_id,
            NEW.dialog_id;
END IF;

    IF NEW.sender_user_id = dialog_applicant_user_id AND NEW.sender_role <> 'APPLICANT' THEN
        RAISE EXCEPTION
            'Sender role % does not match applicant participant for dialog %',
            NEW.sender_role,
            NEW.dialog_id;
END IF;

    IF NEW.sender_user_id = dialog_employer_user_id AND NEW.sender_role <> 'EMPLOYER' THEN
        RAISE EXCEPTION
            'Sender role % does not match employer participant for dialog %',
            NEW.sender_role,
            NEW.dialog_id;
END IF;

RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_chat_participant_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
dialog_applicant_user_id BIGINT;
    dialog_employer_user_id BIGINT;
    actual_message_dialog_id BIGINT;
BEGIN
SELECT
    applicant_user_id,
    employer_user_id
INTO
    dialog_applicant_user_id,
    dialog_employer_user_id
FROM chat_dialog
WHERE id = NEW.dialog_id;

IF dialog_applicant_user_id IS NULL THEN
        RAISE EXCEPTION 'Chat dialog % does not exist', NEW.dialog_id;
END IF;

    IF NEW.user_id NOT IN (dialog_applicant_user_id, dialog_employer_user_id) THEN
        RAISE EXCEPTION
            'User % is not a participant of dialog %',
            NEW.user_id,
            NEW.dialog_id;
END IF;

    IF NEW.last_read_message_id IS NULL THEN
        RETURN NEW;
END IF;

SELECT dialog_id
INTO actual_message_dialog_id
FROM chat_message
WHERE id = NEW.last_read_message_id;

IF actual_message_dialog_id IS NULL THEN
        RAISE EXCEPTION 'Chat message % does not exist', NEW.last_read_message_id;
END IF;

    IF actual_message_dialog_id <> NEW.dialog_id THEN
        RAISE EXCEPTION
            'last_read_message_id % does not belong to dialog %',
            NEW.last_read_message_id,
            NEW.dialog_id;
END IF;

RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chat_dialog_set_updated_at
    BEFORE UPDATE ON chat_dialog
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_chat_dialog_validate_consistency
    BEFORE INSERT OR UPDATE OF opportunity_response_id, opportunity_id, applicant_user_id, employer_user_id
                     ON chat_dialog
                         FOR EACH ROW
                         EXECUTE FUNCTION validate_chat_dialog_consistency();

CREATE TRIGGER trg_chat_dialog_validate_last_message
    BEFORE UPDATE OF last_message_id
    ON chat_dialog
    FOR EACH ROW
    EXECUTE FUNCTION validate_chat_dialog_last_message();

CREATE TRIGGER trg_chat_message_validate_sender
    BEFORE INSERT OR UPDATE OF dialog_id, sender_user_id, sender_role
                     ON chat_message
                         FOR EACH ROW
                         EXECUTE FUNCTION validate_chat_message_sender();

CREATE TRIGGER trg_chat_participant_state_validate
    BEFORE INSERT OR UPDATE OF dialog_id, user_id, last_read_message_id
                     ON chat_participant_state
                         FOR EACH ROW
                         EXECUTE FUNCTION validate_chat_participant_state();
