DROP TABLE IF EXISTS cycle_count_schedule;

DROP INDEX IF EXISTS idx_cycle_counts_store_date;

ALTER TABLE cycle_count_items
    DROP COLUMN IF EXISTS scanned_at,
    DROP COLUMN IF EXISTS scanned_by;

ALTER TABLE cycle_counts
    DROP COLUMN IF EXISTS started_at,
    DROP COLUMN IF EXISTS completed_at,
    DROP COLUMN IF EXISTS approved_at,
    DROP COLUMN IF EXISTS notes,
    DROP COLUMN IF EXISTS total_items,
    DROP COLUMN IF EXISTS counted_items;
