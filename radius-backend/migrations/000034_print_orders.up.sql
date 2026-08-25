-- Enums for Print Orders
CREATE TYPE print_order_type AS ENUM ('WEB', 'WALK_IN');
CREATE TYPE print_order_status AS ENUM ('PENDING', 'IN PROGRESS', 'READY FOR PICKUP', 'SHIPPED', 'COMPLETED', 'CANCELLED');

-- Print Services Catalog
CREATE TABLE print_services (
    service_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    description   TEXT,
    category      VARCHAR(50) NOT NULL,
    base_price    DECIMAL(10,2) NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Print Supplies Inventory
CREATE TABLE print_supplies (
    supply_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id          INT REFERENCES stores(store_id) NOT NULL,
    name              VARCHAR(150) NOT NULL,
    description       TEXT,
    unit              VARCHAR(30) DEFAULT 'EACH',
    current_qty       INT NOT NULL DEFAULT 0,
    reorder_threshold INT NOT NULL DEFAULT 10,
    reorder_qty       INT NOT NULL DEFAULT 50,
    unit_cost         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    supplier_name     VARCHAR(150),
    is_active         BOOLEAN DEFAULT TRUE,
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Print Orders
CREATE TABLE print_orders (
    print_order_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id         INT REFERENCES stores(store_id) NOT NULL,
    customer_name    VARCHAR(150) NOT NULL,
    customer_email   VARCHAR(150),
    customer_phone   VARCHAR(30),
    order_type       print_order_type NOT NULL,
    status           print_order_status DEFAULT 'PENDING' NOT NULL,
    subtotal         DECIMAL(10,2) NOT NULL,
    tax_amount       DECIMAL(10,2) NOT NULL,
    shipping_fee     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount     DECIMAL(10,2) NOT NULL,
    shipping_address TEXT,
    notes            TEXT,
    placed_at        TIMESTAMPTZ DEFAULT NOW(),
    fulfilled_at     TIMESTAMPTZ
);

-- Print Order Items
CREATE TABLE print_order_items (
    print_order_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    print_order_id      BIGINT REFERENCES print_orders(print_order_id) ON DELETE CASCADE NOT NULL,
    service_id          BIGINT REFERENCES print_services(service_id),
    description         VARCHAR(255) NOT NULL,
    quantity            INT NOT NULL,
    unit_price          DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_print_orders_store_status ON print_orders (store_id, status);
CREATE INDEX idx_print_orders_placed_at ON print_orders (placed_at DESC);
CREATE INDEX idx_print_supplies_store ON print_supplies (store_id, is_active);
