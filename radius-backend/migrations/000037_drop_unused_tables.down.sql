-- Recreate custom enums
CREATE TYPE out_of_stock_log_detected_by AS ENUM ('SYSTEM', 'EMPLOYEE');
CREATE TYPE out_of_stock_log_resolution AS ENUM ('RESTOCKED', 'DISCONTINUED', 'RELOCATED');
CREATE TYPE price_tag_jobs_job_type AS ENUM ('PLANOGRAM', 'PRICE CHANGE', 'NEW ITEM', 'CLEARANCE');
CREATE TYPE price_tag_jobs_status AS ENUM ('PENDING', 'PRINTED');
CREATE TYPE price_tag_job_items_label_template AS ENUM ('SHELF TAG', 'SMALL BUSINESS', 'BUSINESS', 'LARGE', 'CLEARANCE');

-- Recreate audit_log
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id INT REFERENCES employees (employee_id),
    action_taken VARCHAR(255) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INT,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate out_of_stock_log
CREATE TABLE IF NOT EXISTS out_of_stock_log (
    oos_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id),
    product_id INT REFERENCES products (product_id),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    detected_by out_of_stock_log_detected_by DEFAULT 'SYSTEM',
    employee_id INT REFERENCES employees (employee_id),
    resolved_at TIMESTAMPTZ,
    resolution out_of_stock_log_resolution,
    auto_reorder_triggered BOOLEAN DEFAULT FALSE,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_oos_open ON out_of_stock_log (store_id, product_id) WHERE resolved_at IS NULL;

-- Recreate price_history
CREATE TABLE IF NOT EXISTS price_history (
    price_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id INT REFERENCES products (product_id),
    store_id INT REFERENCES stores (store_id),
    regular_price DECIMAL (10, 2) NOT NULL,
    sale_price DECIMAL (10, 2),
    sale_start TIMESTAMPTZ,
    sale_end TIMESTAMPTZ,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_till TIMESTAMPTZ,
    created_by INT REFERENCES employees (employee_id) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_current_price ON price_history (product_id, store_id) WHERE effective_till IS NULL;

-- Recreate price_tag_jobs
CREATE TABLE IF NOT EXISTS price_tag_jobs (
    tag_job_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id),
    job_type price_tag_jobs_job_type,
    requested_by INT REFERENCES employees (employee_id),
    status price_tag_jobs_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    printed_at TIMESTAMPTZ
);

-- Recreate price_tag_job_items
CREATE TABLE IF NOT EXISTS price_tag_job_items (
    tag_item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tag_job_id INT REFERENCES price_tag_jobs (tag_job_id),
    product_id INT REFERENCES products (product_id),
    label_template price_tag_job_items_label_template DEFAULT 'SHELF TAG',
    price DECIMAL (10, 2) NOT NULL,
    printed BOOLEAN DEFAULT FALSE
);

-- Recreate print_services
CREATE TABLE IF NOT EXISTS print_services (
    service_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate print_supplies
CREATE TABLE IF NOT EXISTS print_supplies (
    supply_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    unit VARCHAR(30) DEFAULT 'EACH',
    current_qty INT NOT NULL DEFAULT 0,
    reorder_threshold INT NOT NULL DEFAULT 10,
    reorder_qty INT NOT NULL DEFAULT 50,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    supplier_name VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_print_supplies_store ON print_supplies (store_id, is_active);

-- Recreate foreign key constraint on print_order_items
ALTER TABLE print_order_items ADD CONSTRAINT print_order_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES print_services(service_id);

