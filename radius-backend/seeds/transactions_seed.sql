-- TRUNCATE transactions RESTART IDENTITY CASCADE;

INSERT INTO transactions (store_id, register_id, transaction_type, subtotal, tax_amount, total_amount, payment_method, status) VALUES
(1, 'REG-01', 'SALE', 100.00, 13.00, 113.00, 'CARD', 'COMPLETED'),
(1, 'REG-02', 'SALE', 50.00, 6.50, 56.50, 'CASH', 'COMPLETED'),
(2, 'REG-01', 'SALE', 200.00, 26.00, 226.00, 'CARD', 'COMPLETED'),
(50, 'REG-01', 'SALE', 25.00, 3.25, 28.25, 'CARD', 'COMPLETED'),
(25, 'REG-03', 'SALE', 15.00, 1.95, 16.95, 'GIFT CARD', 'COMPLETED');

-- TRUNCATE transaction_items RESTART IDENTITY CASCADE;

-- Transaction 1 (ID 1)
INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, discount_amount) VALUES
(1, 1, 5, 12.99, 0.00), -- 5 units of product 1
(1, 14, 2, 14.99, 0.00); -- 2 units of product 14

-- Transaction 2 (ID 2)
INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, discount_amount) VALUES
(2, 4, 2, 19.99, 0.00);

-- Transaction 3 (ID 3)
INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, discount_amount) VALUES
(3, 121, 2, 65.00, 0.00);

-- Transaction 4 (ID 4)
INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, discount_amount) VALUES
(4, 161, 1, 7.99, 0.00);

-- Transaction 5 (ID 5)
INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, discount_amount) VALUES
(5, 73, 2, 5.00, 0.00);
