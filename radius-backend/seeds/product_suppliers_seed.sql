TRUNCATE product_suppliers;

-- Dynamically link every product to a random supplier using the product's default cost as the supplier cost.
-- This ensures all 284 products have a primary supplier without hardcoding IDs.
INSERT INTO product_suppliers (product_id, supplier_id, supplier_sku, cost_price, is_primary)
SELECT 
    product_id, 
    (random() * 9 + 1)::int AS supplier_id, -- Picks a random supplier between 1 and 10
    'SUP-' || sku AS supplier_sku,          -- Generates a mock supplier SKU
    default_cost,                           -- Uses the realistic cost generated in products_seed
    TRUE AS is_primary
FROM products;
