ALTER TABLE purchase_orders DROP COLUMN arrived_at;

CREATE TYPE purchase_orders_status_old AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED');

ALTER TABLE purchase_orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE purchase_orders ALTER COLUMN status TYPE purchase_orders_status_old USING (
    CASE status::text 
        WHEN 'SHIPPED' THEN 'SENT'
        WHEN 'DELIVERING' THEN 'SENT'
        WHEN 'DELIVERED' THEN 'SENT'
        ELSE status::text
    END
)::purchase_orders_status_old;
ALTER TABLE purchase_orders ALTER COLUMN status SET DEFAULT 'DRAFT';

DROP TYPE purchase_orders_status;
ALTER TYPE purchase_orders_status_old RENAME TO purchase_orders_status;
