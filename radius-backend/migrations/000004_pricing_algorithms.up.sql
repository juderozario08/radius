CREATE TABLE price_history (
    price_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id INT REFERENCES products (product_id),
    store_id INT REFERENCES stores (store_id),
    regular_price DECIMAL (10, 2) NOT NULL,
    sale_price DECIMAL (10, 2),
    sale_start TIMESTAMPTZ,
    sale_end TIMESTAMPTZ,
    effective_from TIMESTAMPTZ DEFAULT NOW (),
    effective_till TIMESTAMPTZ,
    created_by INT REFERENCES employees (employee_id) NOT NULL
);

CREATE UNIQUE INDEX idx_current_price ON price_history (product_id, store_id) WHERE effective_till IS NULL ;

CREATE TABLE planograms (
    planogram_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id) NOT NULL,
    name VARCHAR (150) NOT NULL,
    description TEXT,
    aisle VARCHAR (20),
    valid_from TIMESTAMPTZ DEFAULT NOW (),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES employees (employee_id),
    created_at TIMESTAMPTZ DEFAULT NOW (),
    updated_at TIMESTAMPTZ DEFAULT NOW ()
) ;

CREATE TABLE planogram_products (
    planogram_item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id),
    planogram_id INT REFERENCES planograms (planogram_id) ON DELETE CASCADE,
    product_id INT REFERENCES products (product_id) NOT NULL,
    facings INT DEFAULT 1 NOT NULL,
    UNIQUE (planogram_id, product_id, store_id)
) ;

