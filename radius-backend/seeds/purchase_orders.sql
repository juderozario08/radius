-- TRUNCATE purchase_orders RESTART IDENTITY CASCADE;
-- TRUNCATE purchase_orders_items RESTART IDENTITY CASCADE;

-- Create two POs
INSERT INTO purchase_orders (store_id, supplier_id, status, ordered_at, created_by) VALUES
(1, 1, 'RECEIVED', NOW() - INTERVAL '14 days', 1), -- Completed order
(1, 2, 'DRAFT', NOW(), 1);                         -- New order in progress

-- Add items to PO 1
INSERT INTO purchase_orders_items (po_id, product_id, qty_ordered, qty_received, unit_cost) VALUES
(1, 1, 100, 100, 6.50),
(1, 2, 100, 100, 6.50);

-- Add items to PO 2
INSERT INTO purchase_orders_items (po_id, product_id, qty_ordered, qty_received, unit_cost) VALUES
(2, 4, 50, 0, 10.00);
