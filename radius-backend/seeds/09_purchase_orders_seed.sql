ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_created_by_fkey;

INSERT INTO purchase_orders (store_id, supplier_id, status, ordered_at, expected_at, arrived_at, created_by) VALUES
(1, 1, 'SHIPPED', NOW() - INTERVAL '5 days', NOW() + INTERVAL '2 days', NULL, 1),
(1, 2, 'DELIVERING', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', NULL, 1),
(1, 1, 'DELIVERED', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day', NOW() - INTERVAL '2 hours', 1),
(1, 2, 'PARTIAL', NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 hours', 1),
(1, 3, 'RECEIVED', NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '14 days', 1),
(1, 2, 'RECEIVED', NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '19 days', 1),
(1, 1, 'DELIVERED', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', NOW() - INTERVAL '4 hours', 1),
(2, 3, 'SHIPPED', NOW() - INTERVAL '4 days', NOW() + INTERVAL '3 days', NULL, 1),
(2, 2, 'DELIVERING', NOW() - INTERVAL '1 days', NOW() + INTERVAL '1 day', NULL, 1);

INSERT INTO purchase_orders_items (po_id, product_id, qty_ordered, unit_cost) VALUES
(1, 1, 100, 10.50),
(1, 2, 50, 5.25),
(2, 3, 200, 2.10),
(2, 4, 150, 3.40),
(3, 5, 75, 12.00),
(3, 6, 120, 8.50),
(4, 7, 300, 1.20),
(5, 8, 45, 25.00),
(6, 9, 60, 18.75),
(7, 10, 80, 14.20);

INSERT INTO purchase_order_lprs (po_id, lpr_barcode) VALUES
(1, '10000000000000000001'),
(1, '10000000000000000002'),
(2, '10000000000000000003'),
(3, '20000000000000000001'),
(3, '20000000000000000002');

INSERT INTO purchase_order_lpr_items (lpr_id, po_item_id, qty) VALUES
(1, 1, 24),
(1, 2, 12),
(2, 3, 30),
(2, 4, 15),
(3, 5, 40),
(3, 6, 24),
(4, 5, 12),
(4, 6, 30),
(5, 5, 24),
(5, 6, 10);


ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES employees(employee_id) NOT VALID;
