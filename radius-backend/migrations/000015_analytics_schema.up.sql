CREATE TYPE location_type AS ENUM ('STORE', 'WAREHOUSE', 'BACKROOM', 'DEMO');
CREATE TYPE inventory_transaction_type AS ENUM ('RECEIPT', 'SALE', 'RETURN', 'TRANSFER', 'ADJUSTMENT', 'DAMAGE', 'DEMO_ASSIGNMENT', 'WRITE_OFF');
CREATE TYPE tax_class AS ENUM ('STANDARD', 'EXEMPT', 'REDUCED');

ALTER TABLE products
    ADD COLUMN default_cost DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN default_price DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN tax_class tax_class DEFAULT 'STANDARD',
    ADD COLUMN is_returnable BOOLEAN DEFAULT TRUE,
    ADD COLUMN warranty_days INT DEFAULT 0,
    ADD COLUMN images JSONB DEFAULT '[]',
    ADD COLUMN color VARCHAR(50),
    ADD COLUMN size VARCHAR(50),
    ADD COLUMN lifecycle_stage VARCHAR(50) DEFAULT 'ACTIVE';

ALTER TABLE stores
    ADD COLUMN location_type location_type DEFAULT 'STORE',
    ADD COLUMN region VARCHAR(100),
    ADD COLUMN open_date DATE,
    ADD COLUMN close_date DATE,
    ADD COLUMN manager_id INT REFERENCES employees(employee_id);

ALTER TABLE inventory
    ADD COLUMN in_transit_qty INT NOT NULL DEFAULT 0,
    ADD COLUMN sellable_qty INT NOT NULL DEFAULT 0,
    ADD COLUMN non_sellable_qty INT NOT NULL DEFAULT 0,
    ADD COLUMN demo_qty INT NOT NULL DEFAULT 0,
    ADD COLUMN open_box_qty INT NOT NULL DEFAULT 0,
    ADD COLUMN damaged_qty INT NOT NULL DEFAULT 0,
    ADD COLUMN returned_qty INT NOT NULL DEFAULT 0;

CREATE TABLE inventory_transactions (
    transaction_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id INT REFERENCES products (product_id) NOT NULL,
    from_store_id INT REFERENCES stores (store_id),
    to_store_id INT REFERENCES stores (store_id),
    transaction_type inventory_transaction_type NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(10,2),
    unit_price DECIMAL(10,2),
    reason_code VARCHAR(100),
    employee_id INT REFERENCES employees (employee_id),
    reference_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
    audit_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id INT REFERENCES employees (employee_id),
    action_taken VARCHAR(255) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INT,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
