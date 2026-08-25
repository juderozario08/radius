-- ==============================================================================
-- 13_print_orders_seed.sql
-- Seed data for Print Services, Supplies, Orders, and Items
-- ==============================================================================

-- Truncate existing print data and reset primary key identity sequences
TRUNCATE TABLE 
    print_order_items,
    print_orders,
    print_supplies,
    print_services
RESTART IDENTITY CASCADE;

-- 1. Print Services Catalog
INSERT INTO print_services (name, description, category, base_price, is_active) VALUES
('Standard B&W Printing (Letter)', 'Single-sided 20lb white bond paper', 'DOCUMENT_PRINTING', 0.15, true),
('Full Color Presentation Printing', 'Double-sided 28lb bright white paper with clear cover', 'DOCUMENT_PRINTING', 1.25, true),
('Spiral Bound Training Manual', 'Up to 50 pages double-sided with vinyl back & frost cover', 'DOCUMENT_PRINTING', 14.99, true),
('Premium Matte Business Cards (500)', '16pt cardstock with smooth matte coating', 'MARKETING_COLLATERAL', 29.99, true),
('Glossy Tri-Fold Brochures (100)', '100lb glossy text paper, full color full bleed', 'MARKETING_COLLATERAL', 49.99, true),
('Event Postcards 4x6 (250)', '14pt glossy cardstock, dual-sided color', 'MARKETING_COLLATERAL', 34.99, true),
('Outdoor Vinyl Banner 3x6 ft', '13oz heavy-duty scrim vinyl with metal grommets', 'WIDE_FORMAT_SIGNAGE', 79.99, true),
('Foam Board Presentation Poster 24x36', 'Full color mount on 3/16 inch white foam core', 'WIDE_FORMAT_SIGNAGE', 44.99, true),
('Heavy-Duty Yard Sign 18x24', 'Corrugated plastic with wire H-stake included', 'WIDE_FORMAT_SIGNAGE', 24.99, true),
('High-Gloss Lamination (Menu Size)', '5 mil thermal pouch sealed edges', 'BINDING_FINISHING', 3.50, true),
('Twin Loop Wire Binding (per book)', 'Durable metallic wire binding with black comb', 'BINDING_FINISHING', 6.00, true),
('Custom Die-Cut Vinyl Stickers (100)', 'Waterproof UV-resistant gloss vinyl stickers', 'CUSTOM_MERCHANDISE', 39.99, true),
('Custom Branded Notepads (50 sheets, 5pk)', '70lb premium uncoated paper with chipboard back', 'CUSTOM_MERCHANDISE', 22.50, true);

-- 2. Print Supplies Inventory
INSERT INTO print_supplies (store_id, name, description, unit, current_qty, reorder_threshold, reorder_qty, unit_cost, supplier_name, is_active) VALUES
(1, '20lb White Bond Paper (Letter Ream)', '500 sheets standard copy paper', 'REAM', 45, 15, 50, 4.50, 'Domtar Paper Supply', true),
(1, '28lb Bright White Laser Paper', '500 sheets heavy presentation paper', 'REAM', 12, 10, 30, 8.20, 'Hammermill Commercial', true),
(1, '16pt Matte Cardstock (12x18 Sheets)', '250 sheets premium cardstock', 'PACK', 8, 10, 25, 18.50, 'Mohawk Fine Papers', true),
(1, '13oz Scrim Vinyl Banner Roll 36"x100ft', 'Matte white wide format roll', 'ROLL', 3, 2, 5, 65.00, 'Grimco Graphic Supplies', true),
(1, 'Black Toner Cartridge (DocuColor 550)', 'High-yield black toner 30k pages', 'CARTRIDGE', 2, 2, 4, 120.00, 'Xerox Canada', true),
(1, 'Cyan Toner Cartridge (DocuColor 550)', 'High-yield cyan toner 34k pages', 'CARTRIDGE', 1, 2, 4, 145.00, 'Xerox Canada', true),
(1, 'Thermal Lamination Pouches (Letter 5mil)', 'Box of 100 laminating pouches', 'BOX', 14, 5, 20, 12.00, 'GBC Binding Systems', true),
(1, 'Black Spiral Binding Coils (12mm)', 'Box of 100 coils 4:1 pitch', 'BOX', 6, 4, 10, 15.00, 'Akiles Binding Products', true),

(2, '20lb White Bond Paper (Letter Ream)', '500 sheets standard copy paper', 'REAM', 38, 15, 50, 4.50, 'Domtar Paper Supply', true),
(2, '16pt Matte Cardstock (12x18 Sheets)', '250 sheets premium cardstock', 'PACK', 15, 10, 25, 18.50, 'Mohawk Fine Papers', true),
(2, '13oz Scrim Vinyl Banner Roll 36"x100ft', 'Matte white wide format roll', 'ROLL', 1, 2, 5, 65.00, 'Grimco Graphic Supplies', true),
(2, 'Black Toner Cartridge (DocuColor 550)', 'High-yield black toner 30k pages', 'CARTRIDGE', 3, 2, 4, 120.00, 'Xerox Canada', true),
(2, 'Thermal Lamination Pouches (Letter 5mil)', 'Box of 100 laminating pouches', 'BOX', 8, 5, 20, 12.00, 'GBC Binding Systems', true);

-- 3. Print Orders (Web Orders & Walk-In across stores)
INSERT INTO print_orders (store_id, customer_name, customer_email, customer_phone, order_type, status, subtotal, tax_amount, shipping_fee, total_amount, shipping_address, notes, placed_at, fulfilled_at) VALUES
-- Web Orders (Store 1)
(1, 'Sarah Jenkins', 'sjenkins@apextech.io', '416-555-0143', 'WEB', 'READY FOR PICKUP', 59.98, 7.80, 0.00, 67.78, 'Store Pickup Counter', 'Please double-box and include receipt in bag', NOW() - INTERVAL '2 hours', NULL),
(1, 'Michael Chang', 'mchang@novadesign.ca', '416-555-0188', 'WEB', 'IN PROGRESS', 124.98, 16.25, 12.50, 153.73, '450 University Ave, Suite 800, Toronto, ON M5G 1V2', 'Deliver before 4 PM on weekday', NOW() - INTERVAL '5 hours', NULL),
(1, 'David Miller', 'dmiller@millerlegal.com', '416-555-0122', 'WEB', 'PENDING', 29.99, 3.90, 0.00, 33.89, 'Store Pickup Counter', 'Hold for David Miller or associate', NOW() - INTERVAL '30 minutes', NULL),
(1, 'Elena Rostova', 'elena.rostova@artgallery.ca', '416-555-0199', 'WEB', 'SHIPPED', 89.98, 11.70, 15.00, 116.68, '12 Queen St East, Unit 4B, Toronto, ON M5C 1N6', 'Tracking: CP892019482CA', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
(1, 'TechCorp Ventures', 'admin@techcorp.com', '416-555-0105', 'WEB', 'COMPLETED', 299.80, 38.97, 0.00, 338.77, 'Store Pickup Counter', 'Signed off and picked up by courier', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
(1, 'Marcus Vance', 'mvance@consulting.com', '416-555-0177', 'WEB', 'CANCELLED', 44.99, 5.85, 0.00, 50.84, 'Store Pickup Counter', 'Customer requested cancellation prior to production', NOW() - INTERVAL '6 days', NULL),
(1, 'Rachel Adams', 'rachel.a@startup.co', '416-555-0164', 'WEB', 'READY FOR PICKUP', 74.98, 9.75, 0.00, 84.73, 'Store Pickup Counter', 'Proof verified via email approval', NOW() - INTERVAL '4 hours', NULL),
(1, 'Green Earth Landscaping', 'orders@greenearth.ca', '416-555-0131', 'WEB', 'IN PROGRESS', 99.96, 12.99, 10.00, 122.95, '88 Bay St, Toronto, ON M5J 2R8', 'Outdoor signs require weatherproof stake kit', NOW() - INTERVAL '1 day', NULL),

-- Walk-In Orders (Store 1)
(1, 'Robert Tremblay', 'robert.tremblay@gmail.com', '416-555-0211', 'WALK_IN', 'READY FOR PICKUP', 18.49, 2.40, 0.00, 20.89, NULL, 'Customer will return at 3:30 PM', NOW() - INTERVAL '1 hour', NULL),
(1, 'Amanda Flores', 'amanda.flores@outlook.com', '416-555-0233', 'WALK_IN', 'IN PROGRESS', 44.99, 5.85, 0.00, 50.84, NULL, 'Rush order for evening presentation', NOW() - INTERVAL '45 minutes', NULL),
(1, 'James Wilson', 'jwilson@cityrealty.com', '416-555-0255', 'WALK_IN', 'COMPLETED', 149.95, 19.49, 0.00, 169.44, NULL, 'Paid in full via terminal 02', NOW() - INTERVAL '1 day', NOW() - INTERVAL '22 hours'),
(1, 'Sophia Chen', 'sophia.chen@uwaterloo.ca', '416-555-0277', 'WALK_IN', 'PENDING', 21.00, 2.73, 0.00, 23.73, NULL, 'Thesis draft printing on 28lb paper', NOW() - INTERVAL '15 minutes', NULL),
(1, 'Apex Dental Clinic', 'frontdesk@apexdental.ca', '416-555-0288', 'WALK_IN', 'COMPLETED', 59.98, 7.80, 0.00, 67.78, NULL, 'New patient intake forms pad', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
(1, 'Carlos Ramirez', 'carlos.r@foodtruck.ca', '416-555-0299', 'WALK_IN', 'READY FOR PICKUP', 35.00, 4.55, 0.00, 39.55, NULL, '10 laminated truck menus', NOW() - INTERVAL '3 hours', NULL),

-- Web Orders (Store 2)
(2, 'Pacific Coast Logistics', 'dispatch@pacificlogistics.ca', '604-555-0311', 'WEB', 'READY FOR PICKUP', 159.98, 19.20, 0.00, 179.18, 'Granville Counter Pickup', 'Hold at customer service desk', NOW() - INTERVAL '3 hours', NULL),
(2, 'Kendra Scott', 'kendra@westcoastyoga.com', '604-555-0322', 'WEB', 'IN PROGRESS', 79.99, 9.60, 14.00, 103.59, '1055 West Georgia St, Vancouver, BC V6E 3P3', 'Send courier notification when shipped', NOW() - INTERVAL '6 hours', NULL),
(2, 'Liam O''Connor', 'liam@vancouverbistro.ca', '604-555-0333', 'WEB', 'PENDING', 49.99, 6.00, 0.00, 55.99, 'Granville Counter Pickup', 'Summer promo menu inserts', NOW() - INTERVAL '1 hour', NULL),
(2, 'Harbourfront Retailers', 'marketing@harbourretail.ca', '604-555-0344', 'WEB', 'SHIPPED', 239.97, 28.80, 20.00, 288.77, '200 Burrard St, Vancouver, BC V6C 3L6', 'Shipped via Canada Post Expedited', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
(2, 'Dr. Emily Watson', 'dr.watson@pacificchiro.ca', '604-555-0355', 'WEB', 'COMPLETED', 89.98, 10.80, 0.00, 100.78, 'Granville Counter Pickup', 'Patient brochure reprint', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),
(2, 'Whistler Snow Tours', 'info@whistlersnow.com', '604-555-0366', 'WEB', 'CANCELLED', 79.99, 9.60, 0.00, 89.59, 'Granville Counter Pickup', 'Duplicate submission', NOW() - INTERVAL '7 days', NULL),
(2, 'Studio 9 Architecture', 'print@studio9arch.ca', '604-555-0377', 'WEB', 'READY FOR PICKUP', 134.97, 16.20, 0.00, 151.17, 'Granville Counter Pickup', '3 sets blueprints on 24x36 foam board', NOW() - INTERVAL '5 hours', NULL),

-- Walk-In Orders (Store 2)
(2, 'Taro Tanaka', 'taro.tanaka@japanconsulting.ca', '604-555-0411', 'WALK_IN', 'READY FOR PICKUP', 29.99, 3.60, 0.00, 33.59, NULL, 'Bilingual English/Japanese business cards', NOW() - INTERVAL '2 hours', NULL),
(2, 'Zoe Washington', 'zoe.w@vancouverarts.org', '604-555-0422', 'WALK_IN', 'IN PROGRESS', 69.98, 8.40, 0.00, 78.38, NULL, 'Gallery exhibition handouts', NOW() - INTERVAL '50 minutes', NULL),
(2, 'Bradley Cooper', 'bcooper@granvillepub.ca', '604-555-0433', 'WALK_IN', 'COMPLETED', 42.00, 5.04, 0.00, 47.04, NULL, 'Weekly bar flyers laminated', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
(2, 'Grace Murray', 'grace.murray@ubc.ca', '604-555-0444', 'WALK_IN', 'PENDING', 15.00, 1.80, 0.00, 16.80, NULL, 'Conference poster draft', NOW() - INTERVAL '20 minutes', NULL),
(2, 'West End Bakery', 'orders@westendbakery.ca', '604-555-0455', 'WALK_IN', 'COMPLETED', 79.98, 9.60, 0.00, 89.58, NULL, 'Custom logo stickers x 200', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days');

-- 4. Print Order Items
INSERT INTO print_order_items (print_order_id, service_id, description, quantity, unit_price) VALUES
-- Order 1 (Sarah Jenkins - 2x Business Cards)
(1, 4, 'Premium Matte Business Cards (500) - Front/Back Color', 2, 29.99),

-- Order 2 (Michael Chang - Banner + Poster)
(2, 7, 'Outdoor Vinyl Banner 3x6 ft - Grommets Every 2ft', 1, 79.99),
(2, 8, 'Foam Board Presentation Poster 24x36 - Matte Laminated', 1, 44.99),

-- Order 3 (David Miller - Business Cards)
(3, 4, 'Premium Matte Business Cards (500) - Standard Template', 1, 29.99),

-- Order 4 (Elena Rostova - 2x Posters)
(4, 8, 'Foam Board Presentation Poster 24x36 - High Resolution Photo', 2, 44.99),

-- Order 5 (TechCorp Ventures - Banners + Manuals + Cards)
(5, 7, 'Outdoor Vinyl Banner 3x6 ft', 2, 79.99),
(5, 3, 'Spiral Bound Training Manual - 50 Pages Color', 6, 14.99),
(5, 4, 'Premium Matte Business Cards (500)', 1, 49.86),

-- Order 6 (Marcus Vance - Cancelled Poster)
(6, 8, 'Foam Board Presentation Poster 24x36', 1, 44.99),

-- Order 7 (Rachel Adams - Postcards + Brochures)
(7, 6, 'Event Postcards 4x6 (250) - Gloss Finish', 1, 34.99),
(7, 12, 'Custom Die-Cut Vinyl Stickers (100) - 2" Circle', 1, 39.99),

-- Order 8 (Green Earth Landscaping - 4x Yard Signs)
(8, 9, 'Heavy-Duty Yard Sign 18x24 - Dual Sided with Stake', 4, 24.99),

-- Order 9 (Robert Tremblay - Training Manual + Coil)
(9, 3, 'Spiral Bound Training Manual - 30 Pages B&W', 1, 14.99),
(9, 10, 'High-Gloss Lamination (Menu Size)', 1, 3.50),

-- Order 10 (Amanda Flores - Foam Board Poster)
(10, 8, 'Foam Board Presentation Poster 24x36 - Color Gloss', 1, 44.99),

-- Order 11 (James Wilson - Brochures + Yard Signs)
(11, 5, 'Glossy Tri-Fold Brochures (100)', 2, 49.99),
(11, 9, 'Heavy-Duty Yard Sign 18x24', 2, 24.99),

-- Order 12 (Sophia Chen - Binding & Presentation)
(12, 2, 'Full Color Presentation Printing - 12 Double-Sided Pages', 1, 15.00),
(12, 11, 'Twin Loop Wire Binding - Black Metal', 1, 6.00),

-- Order 13 (Apex Dental - 2x Business Cards)
(13, 4, 'Premium Matte Business Cards (500) - Appointment Back', 2, 29.99),

-- Order 14 (Carlos Ramirez - 10x Laminated Menus)
(14, 10, 'High-Gloss Lamination (Menu Size) - 5mil Sealed', 10, 3.50),

-- Order 15 (Pacific Coast Logistics - 2x Outdoor Banners)
(15, 7, 'Outdoor Vinyl Banner 3x6 ft - Weatherproof Hemming', 2, 79.99),

-- Order 16 (Kendra Scott - Outdoor Banner)
(16, 7, 'Outdoor Vinyl Banner 3x6 ft', 1, 79.99),

-- Order 17 (Liam O'Connor - Tri-Fold Brochures)
(17, 5, 'Glossy Tri-Fold Brochures (100) - Dine-In Menu', 1, 49.99),

-- Order 18 (Harbourfront Retailers - 3x Banners)
(18, 7, 'Outdoor Vinyl Banner 3x6 ft - Grand Opening', 3, 79.99),

-- Order 19 (Dr. Emily Watson - 2x Posters)
(19, 8, 'Foam Board Presentation Poster 24x36', 2, 44.99),

-- Order 20 (Whistler Snow Tours - Banner)
(20, 7, 'Outdoor Vinyl Banner 3x6 ft', 1, 79.99),

-- Order 21 (Studio 9 Architecture - 3x Posters)
(21, 8, 'Foam Board Presentation Poster 24x36 - Floor Plans', 3, 44.99),

-- Order 22 (Taro Tanaka - Business Cards)
(22, 4, 'Premium Matte Business Cards (500) - Japanese Font Proofed', 1, 29.99),

-- Order 23 (Zoe Washington - Postcards + Stickers)
(23, 6, 'Event Postcards 4x6 (250)', 1, 34.99),
(23, 6, 'Event Postcards 4x6 (250) - Artist Bio', 1, 34.99),

-- Order 24 (Bradley Cooper - 12x Laminated Menus)
(24, 10, 'High-Gloss Lamination (Menu Size)', 12, 3.50),

-- Order 25 (Grace Murray - Presentation Printing)
(25, 2, 'Full Color Presentation Printing - 12 Pages', 1, 15.00),

-- Order 26 (West End Bakery - 2x Custom Stickers)
(26, 12, 'Custom Die-Cut Vinyl Stickers (100) - Gold Foil Accent', 2, 39.99);
