CREATE TABLE stores (
store_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
name VARCHAR (100) NOT NULL,
address VARCHAR (255) NOT NULL,
city VARCHAR (100) NOT NULL,
province VARCHAR (50) NOT NULL,
postal_code VARCHAR (50) NOT NULL,
phone VARCHAR (20) NOT NULL,
timezone VARCHAR (50) DEFAULT 'America/Toronto' NOT NULL,
is_active BOOLEAN DEFAULT TRUE NOT NULL,
created_at TIMESTAMPTZ DEFAULT NOW ()
) ;

CREATE TABLE categories (
category_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
parent_id INT REFERENCES categories (category_id),
name VARCHAR (100) NOT NULL
) ;

CREATE TABLE suppliers (
supplier_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
name VARCHAR (150) NOT NULL,
contact_email VARCHAR (50) NOT NULL,
phone VARCHAR (20),
lead_time_days INT DEFAULT 7,
is_active BOOLEAN DEFAULT TRUE
) ;

CREATE TABLE products (
product_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
sku VARCHAR (10) UNIQUE NOT NULL,
upc VARCHAR (20) UNIQUE NOT NULL,
name VARCHAR (255) NOT NULL,
description TEXT,
category_id INT REFERENCES categories (category_id),
brand VARCHAR (100) NOT NULL,
unit_of_measure measuring_units DEFAULT 'EACH' NOT NULL,
units_per_case INT DEFAULT 1,
weight DECIMAL (8, 3) NOT NULL,
is_active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMPTZ DEFAULT NOW ()
) ;

CREATE TABLE product_suppliers (
product_id INT REFERENCES products (product_id),
supplier_id INT REFERENCES suppliers (supplier_id),
supplier_sku VARCHAR (20) NOT NULL,
cost_price DECIMAL (10, 2) NOT NULL,
is_primary BOOLEAN DEFAULT FALSE,
PRIMARY KEY (product_id, supplier_id)
) ;

