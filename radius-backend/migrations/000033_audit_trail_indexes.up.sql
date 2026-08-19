-- Index for efficient product audit trail lookups (ordered by most recent)
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product
    ON inventory_transactions (product_id, created_at DESC);

-- Index for store-scoped queries
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_store_product
    ON inventory_transactions (to_store_id, product_id, created_at DESC);

-- Add CYCLE_COUNT to the enum
ALTER TYPE inventory_transaction_type ADD VALUE IF NOT EXISTS 'CYCLE_COUNT';
