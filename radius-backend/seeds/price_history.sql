-- TRUNCATE price_history RESTART IDENTITY CASCADE;

INSERT INTO price_history (product_id, store_id, regular_price, sale_price, effective_from, effective_till) VALUES
(1, 1, 12.99, 10.99, NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day'), -- Past sale
(1, 1, 12.99, NULL, NOW(), NULL),                                           -- Current price
(4, 1, 19.99, 15.99, NOW() - INTERVAL '10 days', NULL);                     -- Current sale
