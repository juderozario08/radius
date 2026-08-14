INSERT INTO transactions (store_id, register_id, employee_id, subtotal, tax_amount, total_amount, transaction_type, payment_method, status, card_number, card_type) VALUES
(1, 'REG1', NULL, 40.01, 5.98, 45.99, 'SALE', 'CARD', 'COMPLETED', '4242', 'Visa'),
(1, 'REG2', NULL, 104.84, 15.66, 120.50, 'SALE', 'CARD', 'COMPLETED', '1234', 'MasterCard'),
(2, 'REG1', NULL, 11.30, 1.69, 12.99, 'SALE', 'CASH', 'COMPLETED', NULL, NULL);

INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price) VALUES
(1, 1, 2, 10.00),
(1, 10, 1, 25.99),
(2, 50, 1, 120.50),
(3, 3, 1, 12.99);
