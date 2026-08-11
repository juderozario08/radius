ALTER TABLE online_orders
    DROP COLUMN IF EXISTS customer_first_name,
    DROP COLUMN IF EXISTS customer_last_name,
    
    DROP COLUMN IF EXISTS billing_first_name,
    DROP COLUMN IF EXISTS billing_last_name,
    DROP COLUMN IF EXISTS billing_address_line1,
    DROP COLUMN IF EXISTS billing_address_line2,
    DROP COLUMN IF EXISTS billing_city,
    DROP COLUMN IF EXISTS billing_province,
    DROP COLUMN IF EXISTS billing_postal_code,
    DROP COLUMN IF EXISTS billing_phone,
    DROP COLUMN IF EXISTS billing_company,
    
    DROP COLUMN IF EXISTS payment_method,
    DROP COLUMN IF EXISTS purchase_order_number,
    
    DROP COLUMN IF EXISTS alternate_pickup_person;
