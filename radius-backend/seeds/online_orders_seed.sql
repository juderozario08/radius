-- TRUNCATE online_orders RESTART IDENTITY CASCADE;
-- TRUNCATE online_order_items RESTART IDENTITY CASCADE;

INSERT INTO online_orders (store_id, customer_email, customer_name, order_type, status, subtotal, tax_amount, shipping_fee, total_amount, shipping_address) VALUES
(1, 'customer@example.com', 'Jane Doe', 'PICKUP', 'READY', 25.00, 3.25, 0.00, 28.25, '123 Toronto St, Toronto, ON');

INSERT INTO online_order_items (order_id, product_id, quantity, unit_price, picked_qty) VALUES
(1, 1, 2, 12.99, 2);
