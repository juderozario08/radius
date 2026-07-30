ALTER TABLE stock_transfers
    ADD COLUMN total_transfer_cost DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN shipped_at TIMESTAMPTZ,
    ADD COLUMN carrier VARCHAR(50),
    ADD COLUMN tracking_number VARCHAR(100),
    ADD COLUMN transfer_reason VARCHAR(100);

ALTER TABLE purchase_orders
    ADD COLUMN total_amount DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN shipping_cost DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN tax_amount DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN payment_terms VARCHAR(50),
    ADD COLUMN notes TEXT;

ALTER TABLE cycle_counts
    ADD COLUMN total_variance_cost DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN approved_by INT REFERENCES employees(employee_id);

ALTER TABLE cycle_count_items
    ADD COLUMN variance_cost DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN reason_code VARCHAR(100);
