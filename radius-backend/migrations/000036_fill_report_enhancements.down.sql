-- Migration 000036: Fill Report Enhancements (Down)

DROP INDEX IF EXISTS idx_fill_report_items_report_hole;
DROP INDEX IF EXISTS idx_fill_reports_store_status;

ALTER TABLE fill_report_items DROP CONSTRAINT IF EXISTS uq_fill_report_product;

ALTER TABLE fill_report_items
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS created_at;
