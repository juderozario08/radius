-- Migration 000039: Add assigned_to to online_orders table

ALTER TABLE online_orders
    ADD COLUMN IF NOT EXISTS assigned_to INT REFERENCES employees(employee_id);

CREATE INDEX IF NOT EXISTS idx_online_orders_assigned_to ON online_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_online_orders_dashboard ON online_orders(store_id, order_type, status);
