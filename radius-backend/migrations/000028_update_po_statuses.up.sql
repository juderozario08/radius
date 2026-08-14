CREATE TYPE purchase_orders_status_new AS ENUM ('DRAFT', 'SHIPPED', 'DELIVERING', 'DELIVERED', 'PARTIAL', 'RECEIVED', 'CANCELLED');

ALTER TABLE purchase_orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE purchase_orders ALTER COLUMN status TYPE purchase_orders_status_new USING (
    CASE status::text 
        WHEN 'SENT' THEN 'SHIPPED'
        ELSE status::text
    END
)::purchase_orders_status_new;
ALTER TABLE purchase_orders ALTER COLUMN status SET DEFAULT 'DRAFT';

DROP TYPE purchase_orders_status;
ALTER TYPE purchase_orders_status_new RENAME TO purchase_orders_status;

ALTER TABLE purchase_orders ADD COLUMN arrived_at TIMESTAMPTZ;
