CREATE INDEX IF NOT EXISTS idx_products_description_trgm 
ON products USING gin (description gin_trgm_ops);
