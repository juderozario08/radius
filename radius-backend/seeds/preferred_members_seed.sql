TRUNCATE preferred_members RESTART IDENTITY CASCADE;

INSERT INTO preferred_members (first_name, last_name, email, phone, points_balance, tier_level, joined_date) VALUES
('John', 'Doe', 'john.doe@example.com', '555-0100', 1250, 'SILVER', '2023-01-15'),
('Jane', 'Smith', 'jane.smith@example.com', '555-0101', 500, 'BRONZE', '2023-05-20'),
('Alice', 'Johnson', 'alice.j@example.com', '555-0102', 4500, 'GOLD', '2022-11-10'),
('Bob', 'Williams', 'bob.w@example.com', '555-0103', 8500, 'PLATINUM', '2021-08-05'),
('Charlie', 'Brown', 'cbrown@example.com', '555-0104', 150, 'BRONZE', '2024-01-02'),
('Diana', 'Prince', 'diana.p@example.com', '555-0105', 3200, 'GOLD', '2022-03-12'),
('Evan', 'Wright', 'evan.w@example.com', '555-0106', 750, 'SILVER', '2023-09-28'),
('Fiona', 'Gallagher', 'fiona.g@example.com', '555-0107', 0, 'BRONZE', '2024-06-15'),
('George', 'Martin', 'george.m@example.com', '555-0108', 5400, 'PLATINUM', '2021-12-01'),
('Hannah', 'Abbott', 'hannah.a@example.com', '555-0109', 2100, 'SILVER', '2023-04-18');
