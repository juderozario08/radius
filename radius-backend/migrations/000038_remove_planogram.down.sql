-- Restore tables
CREATE TABLE planograms (
    planogram_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    aisle VARCHAR(50),
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_by INT REFERENCES employees (employee_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE planogram_products (
    planogram_item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    planogram_id INT REFERENCES planograms (planogram_id) ON DELETE CASCADE,
    store_id INT REFERENCES stores (store_id),
    product_id INT REFERENCES products (product_id),
    facings INT DEFAULT 1,
    UNIQUE (planogram_id, product_id, store_id)
);
