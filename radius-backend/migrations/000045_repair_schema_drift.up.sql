DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'inventory' AND column_name = 'mims_location'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'inventory' AND column_name = 'mims_location_id'
    ) THEN
        ALTER TABLE inventory RENAME COLUMN mims_location TO mims_location_id;
    END IF;
END $$;

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS mims_location_id VARCHAR(20);
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS chk_mims_location_format;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'inventory'::regclass AND conname = 'inventory_mims_location_id_fkey'
    ) THEN
        ALTER TABLE inventory
            ADD CONSTRAINT inventory_mims_location_id_fkey
            FOREIGN KEY (mims_location_id) REFERENCES mims_location(mims_location_id);
    END IF;
END $$;

ALTER TABLE stock_transfers
    ADD COLUMN IF NOT EXISTS total_transfer_cost DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS carrier VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS transfer_reason VARCHAR(100);

ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50),
    ADD COLUMN IF NOT EXISTS notes TEXT;
