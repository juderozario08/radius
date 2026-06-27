CREATE TABLE out_of_stock_log (
    oos_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id),
    product_id INT REFERENCES products (product_id),
    detected_at TIMESTAMPTZ DEFAULT NOW (),
    detected_by out_of_stock_log_detected_by DEFAULT 'SYSTEM',
    employee_id INT REFERENCES employees (employee_id),
    resolved_at TIMESTAMPTZ,
    resolution out_of_stock_log_resolution,
    auto_reorder_triggered BOOLEAN DEFAULT FALSE,
    notes TEXT
) ;

CREATE INDEX idx_oos_open ON out_of_stock_log (store_id, product_id) WHERE resolved_at IS NULL;

CREATE TABLE fill_reports (
    fill_report_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id),
    report_date DATE NOT NULL,
    generated_by INT REFERENCES employees (employee_id),
    status fill_reports_status DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW ()
) ;

CREATE TABLE fill_report_items (
    fill_item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fill_report_id INT REFERENCES fill_reports (fill_report_id),
    product_id INT REFERENCES products (product_id),
    fill_qty INT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ
) ;

