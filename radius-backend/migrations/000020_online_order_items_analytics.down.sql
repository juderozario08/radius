ALTER TABLE online_order_items
    DROP COLUMN IF EXISTS tax_amount,
    DROP COLUMN IF EXISTS total_price,
    DROP COLUMN IF EXISTS fulfillment_status,
    DROP COLUMN IF EXISTS is_substituted,
    DROP COLUMN IF EXISTS created_at,
    DROP COLUMN IF EXISTS updated_at;
