-- TRUNCATE inventory RESTART IDENTITY CASCADE;

-- Insert inventory data mapping products to all 50 stores.
-- This creates a baseline of stock for every product in every store.
-- on_hand_qty is randomized between 20 and 200 to simulate real warehouse variety.
INSERT INTO inventory (store_id, product_id, on_hand_qty, reorder_point, aisle)
SELECT
    s.store_id,
    p.product_id,
    (random() * 180 + 20)::int, -- Random stock level
    15,                         -- Standard reorder point
    (random() * 20 + 1)::int    -- Random aisle 1-20
FROM stores s
CROSS JOIN products p;

-- Verify that the low-stock index is functioning
-- This allows you to quickly query for products that need ordering across any store
SELECT * FROM inventory WHERE on_hand_qty <= reorder_point LIMIT 10;
