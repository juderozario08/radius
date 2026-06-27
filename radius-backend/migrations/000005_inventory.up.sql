CREATE TABLE mims_location (
    mims_location_id VARCHAR(20),
    store_id INT REFERENCES stores (store_id),
    CONSTRAINT chk_mims_location_format CHECK (mims_location ~ '^[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{3}$'),
    UNIQUE (mims_location_id, store_id)
);

CREATE TABLE inventory (
    inventory_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id),
    product_id INT REFERENCES products (product_id),
    on_hand_qty INT NOT NULL DEFAULT 0,
    reserved_qty INT NOT NULL DEFAULT 0,
    reorder_point INT DEFAULT 10,
    reorder_qty INT DEFAULT 24,
    aisle VARCHAR (20),
    mims_location_id VARCHAR(20) REFERENCES mims_location (mims_location_id),
    last_counted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW (),
    available_qty INT GENERATED ALWAYS AS (on_hand_qty - reserved_qty) STORED,
    UNIQUE (store_id, product_id)
) ;

CREATE INDEX idx_inventory_lowstock ON inventory (store_id, product_id) WHERE on_hand_qty <= reorder_qty ;

CREATE TABLE mims_location_items (
    mims_location_id VARCHAR(20) REFERENCES mims_location (mims_location_id),
    store_id INT REFERENCES stores (store_id),
    inventory_id INT REFERENCES inventory (inventory_id),
    UNIQUE (mims_location_id, store_id, inventory_id)
);
