TRUNCATE stores RESTART IDENTITY CASCADE;

INSERT INTO stores (name, address, city, province, postal_code, phone, timezone, is_active, location_type, region, open_date) VALUES
('Staples Toronto Downtown', '123 King Street W', 'Toronto', 'Ontario', 'M5H 1J9', '4161234567', 'America/Toronto', true, 'STORE', 'Eastern Canada', '2015-01-01'),
('Staples Toronto Midtown', '456 Yonge Street', 'Toronto', 'Ontario', 'M4Y 1X5', '4162345678', 'America/Toronto', true, 'STORE', 'Eastern Canada', '2016-05-15'),
('Staples Mississauga City Centre', '100 City Centre Dr', 'Mississauga', 'Ontario', 'L5B 2C9', '9051234567', 'America/Toronto', true, 'STORE', 'Eastern Canada', '2018-08-20'),
('Staples Vancouver Granville', '798 Granville Street', 'Vancouver', 'British Columbia', 'V6Z 1K3', '6041234567', 'America/Vancouver', true, 'STORE', 'Western Canada', '2015-03-10'),
('Staples Calgary Downtown', '315 8th Ave SW', 'Calgary', 'Alberta', 'T2P 4K1', '4031234567', 'America/Edmonton', true, 'STORE', 'Western Canada', '2017-11-01'),

-- Added two warehouses for analytics and supply chain operations
('Eastern Distribution Center', '500 Logistics Drive', 'Brampton', 'Ontario', 'L6T 5W4', '9059998888', 'America/Toronto', true, 'WAREHOUSE', 'Eastern Canada', '2010-01-01'),
('Western Distribution Center', '1000 Supply Way', 'Richmond', 'British Columbia', 'V6V 1P6', '6049998888', 'America/Vancouver', true, 'WAREHOUSE', 'Western Canada', '2012-06-01');
