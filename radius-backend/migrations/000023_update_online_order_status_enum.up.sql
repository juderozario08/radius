TRUNCATE TABLE online_order_items, online_orders RESTART IDENTITY CASCADE;

ALTER TABLE online_orders ALTER COLUMN status DROP DEFAULT;

ALTER TYPE online_order_status RENAME TO online_order_status_old;

CREATE TYPE online_order_status AS ENUM (
    'READY FOR PICKUP',
    'WAITING FOR CUSTOMER PICKUP',
    'RELEASED',
    'WORK IN PROGRESS',
    'SHIPPED',
    'DELIVERING',
    'DELIVERED'
);

ALTER TABLE online_orders ALTER COLUMN status TYPE online_order_status USING status::text::online_order_status;

DROP TYPE online_order_status_old;
