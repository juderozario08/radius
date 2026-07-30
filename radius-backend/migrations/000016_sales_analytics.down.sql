ALTER TABLE online_order_items
    DROP COLUMN IF EXISTS unit_cost,
    DROP COLUMN IF EXISTS discount_amount;

ALTER TABLE online_orders
    DROP COLUMN IF EXISTS discount_total,
    DROP COLUMN IF EXISTS promo_code,
    DROP COLUMN IF EXISTS cost_total,
    DROP COLUMN IF EXISTS preferred_member_id,
    DROP COLUMN IF EXISTS carrier,
    DROP COLUMN IF EXISTS tracking_number,
    DROP COLUMN IF EXISTS estimated_delivery_date,
    DROP COLUMN IF EXISTS actual_delivery_date;

ALTER TABLE transaction_items
    DROP COLUMN IF EXISTS unit_cost,
    DROP COLUMN IF EXISTS return_reason;

ALTER TABLE transactions
    DROP COLUMN IF EXISTS discount_total,
    DROP COLUMN IF EXISTS cost_total,
    DROP COLUMN IF EXISTS preferred_member_id,
    DROP COLUMN IF EXISTS payment_reference;

DROP TABLE IF EXISTS preferred_members CASCADE;
