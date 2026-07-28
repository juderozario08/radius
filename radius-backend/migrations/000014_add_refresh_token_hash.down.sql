-- Revert: drop refresh_token_hash and rename access_token_hash back to token_hash
ALTER TABLE sessions DROP COLUMN refresh_token_hash;
ALTER TABLE sessions RENAME COLUMN access_token_hash TO token_hash;
