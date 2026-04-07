ALTER TABLE tag ADD COLUMN normalized_name VARCHAR(255);
UPDATE tag SET normalized_name = TRIM(LOWER(name));
ALTER TABLE tag ALTER COLUMN normalized_name SET NOT NULL;
ALTER TABLE tag ADD CONSTRAINT uk_tag_normalized_name UNIQUE (normalized_name);

ALTER TABLE tag ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE tag_synonym (
     id BIGSERIAL PRIMARY KEY,
     tag_id BIGINT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
     synonym VARCHAR(255) NOT NULL,
     normalized_synonym VARCHAR(255) GENERATED ALWAYS AS (TRIM(LOWER(synonym))) STORED,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     CONSTRAINT uk_tag_synonym UNIQUE (tag_id, normalized_synonym)
);

CREATE INDEX idx_tag_normalized_name ON tag(normalized_name);