-- Migration 000039 Down: Remove assigned_to from online_orders table

DROP INDEX IF EXISTS idx_online_orders_dashboard;
DROP INDEX IF EXISTS idx_online_orders_assigned_to;

ALTER TABLE online_orders
    DROP COLUMN IF EXISTS assigned_to;
