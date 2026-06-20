CREATE TABLE stock_transfers (
    transfer_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    from_store_id INT REFERENCES stores (store_id) NOT NULL,
    to_store_id INT REFERENCES stores (store_id) NOT NULL,
    status stock_transfer_status DEFAULT 'PENDING',
    requested_by INT REFERENCES employees (employee_id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW () NOT NULL,
    received_at TIMESTAMPTZ
);

CREATE TABLE stock_transfer_items (
    transfer_item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transfer_id INT REFERENCES stock_transfers (transfer_id),
    product_id INT REFERENCES products (product_id),
    qty_requested INT NOT NULL,
    qty_sent INT,
    qty_received INT
);

CREATE TABLE purchase_orders (
    po_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id),
    supplier_id INT REFERENCES suppliers (supplier_id),
    status purchase_orders_status DEFAULT 'DRAFT',
    ordered_at TIMESTAMPTZ NOT NULL,
    expected_at TIMESTAMPTZ,
    created_by INT REFERENCES employees (employee_id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW ()
);

CREATE TABLE purchase_orders_items (
    po_item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    po_id INT REFERENCES purchase_orders (po_id) NOT NULL,
    product_id INT REFERENCES products (product_id) NOT NULL,
    qty_ordered INT NOT NULL,
    qty_received INT DEFAULT 0 NOT NULL,
    unit_cost DECIMAL (10, 2) NOT NULL
);
