CREATE TABLE preferred_members (
    member_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    points_balance INT DEFAULT 0,
    tier_level VARCHAR(50) DEFAULT 'BRONZE',
    joined_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions
    ADD COLUMN discount_total DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN cost_total DECIMAL(10, 2),
    ADD COLUMN preferred_member_id INT REFERENCES preferred_members(member_id),
    ADD COLUMN payment_reference VARCHAR(100);

ALTER TABLE transaction_items
    ADD COLUMN unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN return_reason VARCHAR(100);

ALTER TABLE online_orders
    ADD COLUMN discount_total DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN promo_code VARCHAR(50),
    ADD COLUMN cost_total DECIMAL(10, 2),
    ADD COLUMN preferred_member_id INT REFERENCES preferred_members(member_id),
    ADD COLUMN carrier VARCHAR(50),
    ADD COLUMN tracking_number VARCHAR(100),
    ADD COLUMN estimated_delivery_date DATE,
    ADD COLUMN actual_delivery_date TIMESTAMPTZ;

ALTER TABLE online_order_items
    ADD COLUMN unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0;
