-- Migration 000035: Cycle Count Enhancements

-- Add new enum values to cycle_count_status
ALTER TYPE cycle_count_status ADD VALUE IF NOT EXISTS 'PENDING APPROVAL';
ALTER TYPE cycle_count_status ADD VALUE IF NOT EXISTS 'APPROVED';

-- Add tracking columns to cycle_counts
ALTER TABLE cycle_counts
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS total_items INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS counted_items INT NOT NULL DEFAULT 0;

-- Add tracking columns to cycle_count_items
ALTER TABLE cycle_count_items
    ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scanned_by INT REFERENCES employees(employee_id);

-- Create schedule table for calendar view
CREATE TABLE IF NOT EXISTS cycle_count_schedule (
    schedule_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id INT REFERENCES stores (store_id) NOT NULL,
    category_id INT REFERENCES categories (category_id) NOT NULL,
    scheduled_date DATE NOT NULL,
    created_by INT REFERENCES employees (employee_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cycle_count_id INT REFERENCES cycle_counts (count_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cycle_count_schedule_store_date ON cycle_count_schedule(store_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_cycle_counts_store_date ON cycle_counts(store_id, count_date);
