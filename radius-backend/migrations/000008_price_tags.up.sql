CREATE TABLE price_tag_jobs (
    tag_job_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id),
    job_type price_tag_jobs_job_type,
    requested_by INT REFERENCES employees (employee_id),
    status price_tag_jobs_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW (),
    printed_at TIMESTAMPTZ
) ;

CREATE TABLE price_tag_job_items (
    tag_item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tag_job_id INT REFERENCES price_tag_jobs (tag_job_id),
    product_id INT REFERENCES products (product_id),
    label_template price_tag_job_items_label_template DEFAULT 'SHELF TAG',
    price DECIMAL (10, 2) NOT NULL,
    printed BOOLEAN DEFAULT FALSE
) ;

