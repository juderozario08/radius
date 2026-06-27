CREATE TABLE transactions (
    transaction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id) NOT NULL,
    register_id VARCHAR (10) NOT NULL,
    employee_id INT REFERENCES employees (employee_id),
    transaction_type transactions_type DEFAULT 'SALE',
    subtotal DECIMAL (10, 2) NOT NULL,
    tax_amount DECIMAL (10, 2) NOT NULL,
    total_amount DECIMAL (10, 2) NOT NULL,
    payment_method transactions_payment_method,
    status transactions_status DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW ()
) ;

CREATE TABLE transaction_items (
    transaction_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id BIGINT REFERENCES transactions (transaction_id),
    product_id INT REFERENCES products (product_id),
    quantity INT NOT NULL,
    unit_price DECIMAL (10, 2) NOT NULL,
    discount_amount DECIMAL (10, 2) DEFAULT 0,
    scanned_barcode VARCHAR (20)
) ;

CREATE INDEX idx_transactions_store_date ON transactions (store_id, created_at);

