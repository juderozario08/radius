ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_created_by_fkey;

INSERT INTO purchase_orders (store_id, supplier_id, status, ordered_at, expected_at, arrived_at, created_by) VALUES
(2, 2, 'RECEIVED', NOW() - INTERVAL '1 days', NOW() + INTERVAL '2 days', NOW() - INTERVAL '1 hours', 1),
(1, 3, 'RECEIVED', NOW() - INTERVAL '2 days', NOW() + INTERVAL '2 days', NOW() - INTERVAL '2 hours', 2),
(2, 4, 'RECEIVED', NOW() - INTERVAL '3 days', NOW() + INTERVAL '2 days', NOW() - INTERVAL '3 hours', 1),
(1, 5, 'RECEIVED', NOW() - INTERVAL '4 days', NOW() + INTERVAL '2 days', NOW() - INTERVAL '4 hours', 2),
(2, 6, 'RECEIVED', NOW() - INTERVAL '5 days', NOW() + INTERVAL '2 days', NOW() - INTERVAL '5 hours', 1),
(1, 7, 'RECEIVED', NOW() - INTERVAL '6 days', NOW() + INTERVAL '2 days', NOW() - INTERVAL '6 hours', 2),
(2, 8, 'RECEIVED', NOW() - INTERVAL '7 days', NOW() + INTERVAL '2 days', NOW() - INTERVAL '7 hours', 1),
(1, 9, 'SHIPPED', NOW() - INTERVAL '8 days', NOW() + INTERVAL '2 days', NULL, 2),
(2, 10, 'SHIPPED', NOW() - INTERVAL '9 days', NOW() + INTERVAL '2 days', NULL, 1),
(1, 1, 'SHIPPED', NOW() - INTERVAL '10 days', NOW() + INTERVAL '2 days', NULL, 2);

INSERT INTO purchase_orders_items (po_id, product_id, qty_ordered, unit_cost) VALUES
(1, 2, 20, 15.00),
(1, 3, 20, 15.00),
(1, 4, 20, 15.00),
(2, 3, 20, 15.00),
(2, 5, 20, 15.00),
(2, 7, 20, 15.00),
(3, 4, 20, 15.00),
(3, 7, 20, 15.00),
(3, 10, 20, 15.00),
(4, 5, 20, 15.00),
(4, 9, 20, 15.00),
(4, 13, 20, 15.00),
(5, 6, 20, 15.00),
(5, 11, 20, 15.00),
(5, 16, 20, 15.00),
(6, 7, 20, 15.00),
(6, 13, 20, 15.00),
(6, 19, 20, 15.00),
(7, 8, 20, 15.00),
(7, 15, 20, 15.00),
(7, 22, 20, 15.00),
(8, 9, 20, 15.00),
(8, 17, 20, 15.00),
(8, 25, 20, 15.00),
(9, 10, 20, 15.00),
(9, 19, 20, 15.00),
(9, 28, 20, 15.00),
(10, 11, 20, 15.00),
(10, 21, 20, 15.00),
(10, 31, 20, 15.00);

ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES employees(employee_id) NOT VALID;
