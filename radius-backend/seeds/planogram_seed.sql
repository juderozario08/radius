-- TRUNCATE planograms RESTART IDENTITY CASCADE;
-- TRUNCATE planogram_products RESTART IDENTITY CASCADE;

-- Create a planogram for Aisle 1
INSERT INTO planograms (store_id, name, aisle) VALUES
(1, 'Writing Instruments Aisle 1', '1');

-- Map products to this planogram
INSERT INTO planogram_products (store_id, planogram_id, product_id, facings) VALUES
(1, 1, 1, 2), -- 2 facings for BIC Black Pens
(1, 4, 1, 1); -- 1 facing for G2 Pens

-- Clean the table again to be safe
-- TRUNCATE planogram_products RESTART IDENTITY CASCADE;
--
-- -- Insert using a subquery to find the ID of the planogram we just created
-- INSERT INTO planogram_products (store_id, planogram_id, product_id, facings)
-- SELECT
--     1,
--     p.planogram_id,
--     prod.product_id,
--     2
-- FROM planograms p
-- JOIN products prod ON prod.sku = '100001' -- Looking up by SKU
-- WHERE p.name = 'Writing Instruments Aisle 1'
-- AND p.store_id = 1;
