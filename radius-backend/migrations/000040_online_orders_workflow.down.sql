-- Migration 000040 Down: online_orders_workflow

ALTER TABLE online_order_items
    DROP COLUMN IF EXISTS reason,
    DROP COLUMN IF EXISTS status;

ALTER TABLE online_orders
    DROP COLUMN IF EXISTS cancellation_reason;
