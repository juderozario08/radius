-- TRUNCATE suppliers RESTART IDENTITY CASCADE;

-- Insert core suppliers
INSERT INTO suppliers (name, contact_email, phone, lead_time_days) VALUES
('BIC USA Inc.', 'orders@bicworld.com', '1-800-555-0101', 5),
('Pilot Pen Corporation', 'supply@pilotpen.com', '1-800-555-0102', 7),
('Staples Sourcing Group', 'procurement@staples.com', '1-800-555-9999', 3),
('Hammermill Paper Co.', 'sales@hammermill.com', '1-800-555-0104', 10),
('HP Inc.', 'b2b-support@hp.com', '1-800-555-0105', 4),
('Logitech Global', 'logi-b2b@logitech.com', '1-800-555-0106', 6),
('Avery Dennison', 'service@avery.com', '1-800-555-0107', 7),
('3M Company', 'industry-supplies@3m.com', '1-800-555-0108', 8),
('Clorox Professional', 'cleaning-solutions@clorox.com', '1-800-555-0109', 5),
('Frito-Lay North America', 'snacks@fritolay.com', '1-800-555-0110', 2);
