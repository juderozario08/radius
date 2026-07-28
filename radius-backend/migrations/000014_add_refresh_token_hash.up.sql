-- Rename token_hash to access_token_hash and add refresh_token_hash
ALTER TABLE sessions RENAME COLUMN token_hash TO access_token_hash;
ALTER TABLE sessions ADD COLUMN refresh_token_hash TEXT NOT NULL DEFAULT '';
