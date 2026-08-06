CREATE TABLE mims_scan_log (
    scan_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id) NOT NULL,
    employee_id INT REFERENCES employees (employee_id) NOT NULL,
    product_id INT REFERENCES products (product_id),
    scanned_barcode VARCHAR(50) NOT NULL,
    mims_location_id VARCHAR(20),
    scan_type VARCHAR(20) NOT NULL DEFAULT 'MIMS',
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mims_scan_log_store_date ON mims_scan_log (store_id, scanned_at);
CREATE INDEX idx_mims_scan_log_product ON mims_scan_log (product_id, scanned_at);
