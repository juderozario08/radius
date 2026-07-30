ALTER TABLE cycle_count_items
    DROP COLUMN IF EXISTS variance_cost,
    DROP COLUMN IF EXISTS reason_code;

ALTER TABLE cycle_counts
    DROP COLUMN IF EXISTS total_variance_cost,
    DROP COLUMN IF EXISTS approved_by;

ALTER TABLE purchase_orders
    DROP COLUMN IF EXISTS total_amount,
    DROP COLUMN IF EXISTS shipping_cost,
    DROP COLUMN IF EXISTS tax_amount,
    DROP COLUMN IF EXISTS payment_terms,
    DROP COLUMN IF EXISTS notes;

ALTER TABLE stock_transfers
    DROP COLUMN IF EXISTS total_transfer_cost,
    DROP COLUMN IF EXISTS shipped_at,
    DROP COLUMN IF EXISTS carrier,
    DROP COLUMN IF EXISTS tracking_number,
    DROP COLUMN IF EXISTS transfer_reason;
