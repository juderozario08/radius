INSERT INTO online_orders (store_id, customer_email, customer_name, subtotal, tax_amount, shipping_fee, total_amount, status, order_type, alternate_pickup_person, shipping_address) VALUES
(1, 'johndoe@example.com', 'John Doe', 200.00, 26.00, 24.00, 250.00, 'AWAITING PICKUP', 'BOPIS', 'Jane Doe', '123 Fake St'),
(2, 'janesmith@example.com', 'Jane Smith', 40.00, 5.20, 0.79, 45.99, 'SHIPPED', 'STS', 'John Smith', '456 Real Ave');

INSERT INTO online_order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 100, 1, 200.00),
(1, 10, 2, 25.00),
(2, 5, 1, 45.99);
