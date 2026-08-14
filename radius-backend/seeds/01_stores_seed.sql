INSERT INTO stores (name, address, city, province, postal_code, phone, timezone, is_active, location_type, region, open_date) VALUES
('Staples Toronto Downtown', '123 King Street W', 'Toronto', 'Ontario', 'M5H 1J9', '4161234567', 'America/Toronto', true, 'STORE', 'Eastern Canada', '2015-01-01'),
('Staples Vancouver Granville', '798 Granville Street', 'Vancouver', 'British Columbia', 'V6Z 1K3', '6041234567', 'America/Vancouver', true, 'STORE', 'Western Canada', '2015-03-10'),
('Eastern Distribution Center', '500 Logistics Drive', 'Brampton', 'Ontario', 'L6T 5W4', '9059998888', 'America/Toronto', true, 'WAREHOUSE', 'Eastern Canada', '2010-01-01'),
('Staples Montreal Downtown', '465 Saint-Jean St', 'Montreal', 'Quebec', 'H2Y 2R6', '5141234567', 'America/Toronto', true, 'STORE', 'Eastern Canada', '2016-08-12'),
('Staples Calgary Macleod', '900 Macleod Trail', 'Calgary', 'Alberta', 'T2G 2M6', '4032345678', 'America/Edmonton', true, 'STORE', 'Western Canada', '2018-02-15'),
('Staples Halifax Shopping Centre', '7001 Mumford Rd', 'Halifax', 'Nova Scotia', 'B3L 4N9', '9021234567', 'America/Halifax', true, 'STORE', 'Eastern Canada', '2019-11-20'),
('Staples Ottawa Rideau', '50 Rideau St', 'Ottawa', 'Ontario', 'K1N 9J7', '6131234567', 'America/Toronto', true, 'STORE', 'Eastern Canada', '2014-05-01'),
('Western Distribution Center', '1000 Supply Way', 'Richmond', 'British Columbia', 'V6V 1P6', '6049998888', 'America/Vancouver', true, 'WAREHOUSE', 'Western Canada', '2012-06-01')
ON CONFLICT (name) DO NOTHING;
