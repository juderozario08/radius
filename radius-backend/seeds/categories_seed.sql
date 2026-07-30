TRUNCATE categories RESTART IDENTITY CASCADE;

-- Insert precise, granular categories designed for cycle counting
-- Cycle counts are much easier when categories refer to specific physical zones or specific product types
INSERT INTO categories (name) VALUES
('Pens & Pencils'),             -- 1
('Markers & Highlighters'),     -- 2
('Dry Erase & Presentation'),   -- 3
('Correction & Erasers'),       -- 4
('Copy & Printer Paper'),       -- 5
('Cardstock & Specialty Paper'),-- 6
('Notebooks & Legal Pads'),     -- 7
('Journals & Diaries'),         -- 8
('Binders & Accessories'),      -- 9
('File Folders & Envelopes'),   -- 10
('Staplers & Hole Punches'),    -- 11
('Clips, Push Pins & Bands'),   -- 12
('Tape & Adhesives'),           -- 13
('Desk Organizers'),            -- 14
('Laptops'),                    -- 15
('Desktop Computers'),          -- 16
('Tablets & E-Readers'),        -- 17
('Monitors & Displays'),        -- 18
('Storage & Hard Drives'),      -- 19
('Networking & Routers'),       -- 20
('Printers (Laser)'),           -- 21
('Printers (Inkjet)'),          -- 22
('Scanners'),                   -- 23
('Ink Cartridges'),             -- 24
('Toner Cartridges'),           -- 25
('Keyboards & Mice'),           -- 26
('Webcams & Audio'),            -- 27
('Cables & Adapters'),          -- 28
('Office Chairs'),              -- 29
('Desks & Tables'),             -- 30
('Filing Cabinets'),            -- 31
('Breakroom Disposables'),      -- 32
('Coffee & Beverages'),         -- 33
('Snacks & Food'),              -- 34
('Cleaning Supplies'),          -- 35
('Safety Equipment');           -- 36
