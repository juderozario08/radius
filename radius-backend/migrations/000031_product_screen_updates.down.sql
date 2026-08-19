DROP INDEX IF EXISTS idx_mims_location_items_unbinned;

ALTER TABLE mims_location_items
DROP COLUMN quantity,
DROP COLUMN location_type;

-- Not strictly necessary, but to revert, we could add back the NOT NULL constraint if we want, but it might fail if there are NULLs.
-- Let's just remove the columns we added.

-- Revert inventory
DROP INDEX IF EXISTS idx_inventory_lowstock;
ALTER TABLE inventory DROP COLUMN available_qty;
ALTER TABLE inventory DROP COLUMN on_hand_qty;

-- Re-add as standard columns
ALTER TABLE inventory
ADD COLUMN on_hand_qty INT NOT NULL DEFAULT 0,
ADD COLUMN available_qty INT GENERATED ALWAYS AS (on_hand_qty - reserved_qty) STORED;

-- Best effort to revert on_hand_qty data
UPDATE inventory SET on_hand_qty = open_box_qty + new_qty + rtv_qty + code88_qty + bopis_qty + quarantine_qty + repair_qty + customer_on_hold_qty + fc_on_hold_qty + verify_qty + demo_qty;

ALTER TABLE inventory
DROP COLUMN open_box_qty,
DROP COLUMN new_qty,
DROP COLUMN rtv_qty,
DROP COLUMN code88_qty,
DROP COLUMN bopis_qty,
DROP COLUMN quarantine_qty,
DROP COLUMN repair_qty,
DROP COLUMN customer_on_hold_qty,
DROP COLUMN fc_on_hold_qty,
DROP COLUMN verify_qty,
DROP COLUMN demo_qty,
DROP COLUMN on_order_qty,
DROP COLUMN last_received_at;

CREATE INDEX idx_inventory_lowstock ON inventory (store_id, product_id) WHERE on_hand_qty <= reorder_qty;

-- Revert products
ALTER TABLE products
DROP COLUMN retail_price,
DROP COLUMN constrained_end_after;
