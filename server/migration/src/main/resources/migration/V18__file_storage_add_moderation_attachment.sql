ALTER TABLE file_asset
DROP CONSTRAINT IF EXISTS chk_file_asset_kind;

ALTER TABLE file_asset
    ADD CONSTRAINT chk_file_asset_kind
        CHECK (kind IN (
                'AVATAR',
                'RESUME',
                'PORTFOLIO',
                'LOGO',
                'OPPORTUNITY_MEDIA',
                'VERIFICATION_ATTACHMENT',
                'APPLICATION_ATTACHMENT',
                'MODERATION_ATTACHMENT',
                'OTHER'
        ));
