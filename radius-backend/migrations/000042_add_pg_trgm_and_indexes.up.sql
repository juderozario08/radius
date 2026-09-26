CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_search_trgm 
ON products USING gin (name gin_trgm_ops, sku gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_inventory_lookup_covering 
ON inventory (store_id, product_id) 
INCLUDE (on_hand_qty, available_qty, aisle, new_qty, open_box_qty);
