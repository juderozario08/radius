CREATE TABLE employees (
    employee_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR (100) NOT NULL UNIQUE,
    store_id INT REFERENCES stores (store_id) NOT NULL,
    first_name VARCHAR (50) NOT NULL,
    last_name VARCHAR (50) NOT NULL,
    role employee_roles DEFAULT 'ADMIN' NOT NULL,
    password_hash VARCHAR (255) NOT NULL,
    phone VARCHAR (20) UNIQUE NOT NULL,
    address VARCHAR (100) NOT NULL,
    city VARCHAR (100) NOT NULL,
    province VARCHAR (100) NOT NULL,
    postal_code VARCHAR (100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
) ;

CREATE TABLE sessions (
    session_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id INT REFERENCES employees(employee_id) ON DELETE CASCADE NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    ip_address INET NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ -- Sessions should always have an explicit expiration
);
