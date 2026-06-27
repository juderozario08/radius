CREATE TABLE online_orders (
    order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id) NOT NULL,
    customer_email VARCHAR (150) NOT NULL,
    customer_name VARCHAR (150) NOT NULL,
    order_type online_order_type NOT NULL,
    status online_order_status DEFAULT 'PLACED' NOT NULL,
    placed_at TIMESTAMPTZ DEFAULT NOW (),
    fulfilled_at TIMESTAMPTZ,
    subtotal DECIMAL (10, 2) NOT NULL,
    tax_amount DECIMAL (10, 2) NOT NULL,
    shipping_fee DECIMAL (10, 2) NOT NULL,
    total_amount DECIMAL (10, 2) NOT NULL,
    shipping_address TEXT NOT NULL
);

CREATE TABLE online_order_items (
    order_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT REFERENCES online_orders (order_id),
    product_id INT REFERENCES products (product_id),
    quantity INT NOT NULL,
    unit_price DECIMAL (10, 2) NOT NULL,
    picked_qty INT DEFAULT 0
) ;

CREATE INDEX idx_online_orders_store_status ON online_orders (store_id, status);

