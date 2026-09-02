-- Drop foreign key constraint referencing print_services
ALTER TABLE IF EXISTS print_order_items DROP CONSTRAINT IF EXISTS print_order_items_service_id_fkey;

-- Drop unused tables
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS out_of_stock_log CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS price_tag_job_items CASCADE;
DROP TABLE IF EXISTS price_tag_jobs CASCADE;
DROP TABLE IF EXISTS print_supplies CASCADE;
DROP TABLE IF EXISTS print_services CASCADE;

-- Drop unused custom enum types
DROP TYPE IF EXISTS price_tag_job_items_label_template;
DROP TYPE IF EXISTS price_tag_jobs_status;
DROP TYPE IF EXISTS price_tag_jobs_job_type;
DROP TYPE IF EXISTS out_of_stock_log_resolution;
DROP TYPE IF EXISTS out_of_stock_log_detected_by;

