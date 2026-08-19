ALTER TABLE products
ADD COLUMN IF NOT EXISTS retail_price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS constrained_end_after DATE;

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS open_box_qty INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_qty INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS rtv_qty INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS code88_qty INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS bopis_qty INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quarantine_qty INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS repair_qty INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_on_hold_qty INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fc_on_hold_qty INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS verify_qty INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS demo_qty INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS on_order_qty INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_received_at TIMESTAMPTZ;

-- Let's update new_qty to match current on_hand_qty before we drop/alter on_hand_qty if we want to make it generated.
UPDATE inventory SET new_qty = on_hand_qty;

-- Drop the lowstock index because it relies on on_hand_qty
DROP INDEX IF EXISTS idx_inventory_lowstock;

-- Drop available_qty because it relies on on_hand_qty
ALTER TABLE inventory DROP COLUMN IF EXISTS available_qty;
ALTER TABLE inventory DROP COLUMN IF EXISTS on_hand_qty;

-- Re-add on_hand_qty and available_qty as GENERATED columns
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS on_hand_qty INT GENERATED ALWAYS AS (
    open_box_qty + new_qty + rtv_qty + code88_qty + bopis_qty + 
    quarantine_qty + repair_qty + customer_on_hold_qty + 
    fc_on_hold_qty + verify_qty + demo_qty
) STORED,
ADD COLUMN IF NOT EXISTS available_qty INT GENERATED ALWAYS AS (
    open_box_qty + new_qty - reserved_qty
) STORED;

CREATE INDEX IF NOT EXISTS idx_inventory_lowstock ON inventory (store_id, product_id) WHERE on_hand_qty <= reorder_qty;

-- Alter mims_location_items
ALTER TABLE mims_location_items
ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) NOT NULL DEFAULT 'OVERSTOCK';

-- We need to allow mims_location_id to be NULL for 'UNBINNED' type
ALTER TABLE mims_location_items
ALTER COLUMN mims_location_id DROP NOT NULL;

CREATE UNIQUE INDEX idx_mims_location_items_unbinned 
ON mims_location_items (store_id, inventory_id) 
WHERE location_type = 'UNBINNED';
