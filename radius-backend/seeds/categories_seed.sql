-- TRUNCATE categories RESTART IDENTITY CASCADE;

-- 1. Insert Top-Level Departments (IDs 1 through 5)
INSERT INTO categories (name) VALUES
('Office Supplies'),
('Technology'),
('Furniture'),
('Facilities & Safety'),
('Print & Marketing');

-- 2. Insert Sub-Categories (linked to the parent IDs above)
INSERT INTO categories (parent_id, name) VALUES
-- Office Supplies (parent_id = 1)
(1, 'Writing Instruments'),
(1, 'Paper & Notebooks'),
(1, 'Binders & Folders'),
(1, 'Desk Accessories'),
(1, 'Mailing & Shipping'),
(1, 'Planners & Calendars'),

-- Technology (parent_id = 2)
(2, 'Computers & Tablets'),
(2, 'Printers & Scanners'),
(2, 'Ink & Toner'),
(2, 'Computer Accessories'),
(2, 'Networking & Cables'),

-- Furniture (parent_id = 3)
(3, 'Chairs & Seating'),
(3, 'Desks & Tables'),
(3, 'Filing & Storage'),
(3, 'Office Decor'),

-- Facilities & Safety (parent_id = 4)
(4, 'Breakroom'),
(4, 'Safety'),
(4, 'Cleaning Supplies'),
(4, 'Coffee & Snacks'),
(4, 'First Aid'),

-- Print & Marketing (parent_id = 5)
(5, 'Business Cards'),
(5, 'Custom Signage'),
(5, 'Promotional Items');
