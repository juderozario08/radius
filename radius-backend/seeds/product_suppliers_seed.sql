-- TRUNCATE product_suppliers;

INSERT INTO product_suppliers (product_id, supplier_id, supplier_sku, cost_price, is_primary) VALUES
-- BIC Products (Supplier 1)
(1, 1, 'BIC-BLK-60', 6.50, TRUE),
(2, 1, 'BIC-BLU-60', 6.50, TRUE),
(3, 1, 'BIC-RED-30', 4.25, TRUE),

-- Pilot Products (Supplier 2)
(4, 2, 'PIL-G2-BLK-12', 10.00, TRUE),
(5, 2, 'PIL-G2-BLU-12', 10.00, TRUE),
(6, 2, 'PIL-G2-AST-8', 8.50, TRUE),

-- Staples/Generic Products (Supplier 3)
(14, 3, 'STP-MECH-PENCIL', 2.00, TRUE),
(21, 3, 'STP-COPY-PAPER-10', 20.00, TRUE),
(161, 3, 'STP-PLATES-300', 4.00, TRUE),

-- HP Products (Supplier 5)
(9, 5, 'HP-LASER-JET-PRO', 150.00, TRUE),
(10, 5, 'HP-67-BLK-INK', 12.00, TRUE),

-- Logitech Products (Supplier 6)
(121, 6, 'LOGI-MX3S-MS', 65.00, TRUE),
(124, 6, 'LOGI-MX-KEYS', 70.00, TRUE),

-- 3M/Scotch Products (Supplier 8)
(73, 8, 'SCO-TAPE-DSP', 5.00, TRUE),
(74, 8, 'SCO-TAPE-INV-6', 3.00, TRUE),
(179, 8, '3M-SAFETY-GLS', 2.50, TRUE),

-- Clorox Products (Supplier 9)
(181, 9, 'CLX-WIPES-3PK', 3.50, TRUE),
(187, 9, 'CLX-BOWL-CLNR', 1.50, TRUE),

-- Frito-Lay (Supplier 10)
(200, 10, 'FL-CHIPS-50CT', 10.00, TRUE);
