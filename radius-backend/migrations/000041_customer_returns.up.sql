DO $$ BEGIN
    CREATE TYPE return_status AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE return_disposition AS ENUM ('RESTOCK', 'OPEN_BOX', 'DEFECTIVE_RTV', 'DAMAGED_WRITE_OFF', 'QUARANTINE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rtv_status AS ENUM ('QUEUED', 'APPROVED', 'SHIPPED', 'CREDITED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE refund_method AS ENUM ('CASH', 'CARD', 'GIFT CARD', 'STORE_CREDIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS customer_returns (
    return_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores(store_id) NOT NULL,
    original_transaction_id BIGINT REFERENCES transactions(transaction_id),
    employee_id INT REFERENCES employees(employee_id) NOT NULL,
    status return_status NOT NULL DEFAULT 'COMPLETED',
    refund_method refund_method NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_refund DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_store_credit BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    approved_by INT REFERENCES employees(employee_id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS customer_return_items (
    return_item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    return_id INT REFERENCES customer_returns(return_id) ON DELETE CASCADE NOT NULL,
    product_id INT REFERENCES products(product_id) NOT NULL,
    original_transaction_item_id BIGINT REFERENCES transaction_items(transaction_item_id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    return_reason VARCHAR(100) NOT NULL,
    disposition return_disposition NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rtv_queue (
    rtv_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    return_item_id INT REFERENCES customer_return_items(return_item_id) ON DELETE CASCADE NOT NULL,
    store_id INT REFERENCES stores(store_id) NOT NULL,
    product_id INT REFERENCES products(product_id) NOT NULL,
    quantity INT NOT NULL,
    status rtv_status NOT NULL DEFAULT 'QUEUED',
    supplier_id INT REFERENCES suppliers(supplier_id),
    reviewed_by INT REFERENCES employees(employee_id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_returns_store_date ON customer_returns(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_returns_orig_tx ON customer_returns(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_customer_return_items_return_id ON customer_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_customer_return_items_product_id ON customer_return_items(product_id);
CREATE INDEX IF NOT EXISTS idx_rtv_queue_store_status ON rtv_queue(store_id, status);

