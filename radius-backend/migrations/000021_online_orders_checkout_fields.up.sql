ALTER TABLE online_orders
    ADD COLUMN customer_first_name VARCHAR(150),
    ADD COLUMN customer_last_name VARCHAR(150),
    
    ADD COLUMN billing_first_name VARCHAR(150),
    ADD COLUMN billing_last_name VARCHAR(150),
    ADD COLUMN billing_address_line1 VARCHAR(255),
    ADD COLUMN billing_address_line2 VARCHAR(255),
    ADD COLUMN billing_city VARCHAR(100),
    ADD COLUMN billing_province VARCHAR(50),
    ADD COLUMN billing_postal_code VARCHAR(20),
    ADD COLUMN billing_phone VARCHAR(20),
    ADD COLUMN billing_company VARCHAR(150),
    
    ADD COLUMN payment_method VARCHAR(50),
    ADD COLUMN purchase_order_number VARCHAR(100),
    
    ADD COLUMN alternate_pickup_person VARCHAR(150);
