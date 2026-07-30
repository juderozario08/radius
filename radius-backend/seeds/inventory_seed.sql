TRUNCATE inventory RESTART IDENTITY CASCADE;

-- Insert inventory data mapping products to all stores.
-- This creates a baseline of stock for every product in every store.
-- The total on_hand_qty is a sum of sellable + non-sellable + demo + open_box + damaged + returned
INSERT INTO inventory (store_id, product_id, on_hand_qty, in_transit_qty, sellable_qty, non_sellable_qty, demo_qty, open_box_qty, damaged_qty, returned_qty, reorder_point, aisle)
SELECT
    s.store_id,
    p.product_id,
    -- Total on hand (sum of all buckets below)
    ((random() * 100 + 50)::int + (random() * 5)::int + (random() * 2)::int + (random() * 3)::int + (random() * 2)::int),
    -- In transit
    (random() * 20)::int,
    -- Sellable
    (random() * 100 + 50)::int,
    -- Non sellable (expired/recalled)
    0,
    -- Demo qty
    (random() * 5)::int,
    -- Open box
    (random() * 2)::int,
    -- Damaged
    (random() * 3)::int,
    -- Returned
    (random() * 2)::int,
    15,                         -- Standard reorder point
    (random() * 20 + 1)::int    -- Random aisle 1-20
FROM stores s
CROSS JOIN products p;

-- Update the on_hand_qty to exactly match the sum of the physical buckets to ensure data integrity
UPDATE inventory 
SET on_hand_qty = sellable_qty + non_sellable_qty + demo_qty + open_box_qty + damaged_qty + returned_qty;

-- Verify that the low-stock index is functioning
-- This allows you to quickly query for products that need ordering across any store
SELECT * FROM inventory WHERE on_hand_qty <= reorder_point LIMIT 10;
