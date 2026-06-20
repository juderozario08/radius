CREATE TABLE cycle_counts (
    count_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id) NOT NULL,
    count_date DATE,
    category_id INT REFERENCES categories (category_id) NOT NULL,
    status cycle_count_status DEFAULT 'IN PROGRESS' NOT NULL,
    counted_by INT REFERENCES employees (employee_id)
);

CREATE TABLE cycle_count_items (
    count_item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    count_id INT REFERENCES cycle_counts (count_id) NOT NULL,
    product_id INT REFERENCES products (product_id) NOT NULL,
    expected_qty INT DEFAULT 0 NOT NULL,
    counted_qty INT DEFAULT 0 NOT NULL,
    variance INT GENERATED ALWAYS AS (counted_qty - expected_qty) STORED
);
