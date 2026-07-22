ALTER TABLE stores ADD CONSTRAINT uq_stores_name UNIQUE (name);

ALTER TABLE stores ADD CONSTRAINT uq_stores_phone UNIQUE (phone);

ALTER TABLE stores ADD CONSTRAINT uq_stores_city_province_postal UNIQUE (city, province, postal_code);
