ALTER TABLE stock_transfers DROP CONSTRAINT stock_transfers_requested_by_fkey;

INSERT INTO stock_transfers (from_store_id, to_store_id, status, requested_by, created_at, received_at) VALUES
(1, 2, 'IN_TRANSIT', 1, '2026-07-02 11:59:21', NULL),
(2, 1, 'PENDING', 1, '2026-07-02 14:56:21', NULL),
(1, 2, 'IN_TRANSIT', 1, '2026-07-11 05:21:58', NULL),
(1, 2, 'CANCELLED', 1, '2026-07-14 08:53:39', NULL),
(2, 1, 'IN_TRANSIT', 1, '2026-07-16 10:53:25', NULL);

INSERT INTO stock_transfer_items (transfer_id, product_id, qty_requested, qty_sent, qty_received) VALUES
(1, 1, 50, 50, 0),
(1, 2, 20, 20, 0),
(2, 3, 100, 0, 0),
(3, 4, 15, 15, 0),
(4, 5, 10, 0, 0),
(5, 6, 40, 40, 0);


ALTER TABLE stock_transfers ADD CONSTRAINT stock_transfers_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES employees(employee_id) NOT VALID;
