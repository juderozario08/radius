-- Migration 000040: online_orders_workflow

ALTER TYPE online_order_status ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE online_orders
    ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);

ALTER TABLE online_order_items
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,
    ADD COLUMN IF NOT EXISTS reason VARCHAR(255);
