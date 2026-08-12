ALTER TYPE online_order_status RENAME TO online_order_status_old;

CREATE TYPE online_order_status AS ENUM (
    'PLACED', 'PICKING', 'PACKED', 'READY', 'OUT FOR DELIVERY', 'COMPLETED', 'CANCELLED'
);

TRUNCATE TABLE online_order_items, online_orders RESTART IDENTITY CASCADE;

ALTER TABLE online_orders ALTER COLUMN status TYPE online_order_status USING status::text::online_order_status;

ALTER TABLE online_orders ALTER COLUMN status SET DEFAULT 'PLACED';

DROP TYPE online_order_status_old;
