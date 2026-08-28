-- Migration 000036: Fill Report Enhancements

-- Add timestamp and auditing columns to fill_report_items if not exists
ALTER TABLE fill_report_items
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraint on (fill_report_id, product_id) for safe upserts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_fill_report_product'
    ) THEN
        ALTER TABLE fill_report_items ADD CONSTRAINT uq_fill_report_product UNIQUE (fill_report_id, product_id);
    END IF;
END $$;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fill_reports_store_status ON fill_reports(store_id, status);
CREATE INDEX IF NOT EXISTS idx_fill_report_items_report_hole ON fill_report_items(fill_report_id, is_empty_hole);
