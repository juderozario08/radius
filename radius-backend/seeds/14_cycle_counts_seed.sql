-- ==============================================================================
-- 14_cycle_counts_seed.sql
-- Seed data for Cycle Counts, Items, and Schedule
-- ==============================================================================

TRUNCATE TABLE 
    cycle_count_schedule,
    cycle_count_items,
    cycle_counts
RESTART IDENTITY CASCADE;

-- 1. Cycle Counts
INSERT INTO cycle_counts (
    store_id, count_date, category_id, status, counted_by, approved_by, 
    total_variance_cost, started_at, completed_at, approved_at, notes, total_items, counted_items
) VALUES
-- Count 1: Currently active / In Progress for this week
(
    1, CURRENT_DATE, 2, 'IN PROGRESS'::cycle_count_status, 1, NULL,
    -33.00, NOW() - INTERVAL '1 hour 15 minutes', NULL, NULL,
    'Weekly High Ticket category count in progress.', 5, 3
),
-- Count 2: Pending Approval
(
    1, CURRENT_DATE - INTERVAL '1 day', 3, 'PENDING APPROVAL'::cycle_count_status, 1, NULL,
    -26.00, NOW() - INTERVAL '1 day 3 hours', NOW() - INTERVAL '1 day 1 hour', NULL,
    'In Ear Headphones & Cables count completed. Discrepancy observed on 2 SKUs.', 4, 4
),
-- Count 3: Approved Count
(
    1, CURRENT_DATE - INTERVAL '3 days', 4, 'APPROVED'::cycle_count_status, 2, 1,
    0.00, NOW() - INTERVAL '3 days 4 hours', NOW() - INTERVAL '3 days 2 hours', NOW() - INTERVAL '3 days 1 hour',
    'Mobile phone chargers reconciled and verified.', 4, 4
),
-- Count 4: Completed Count
(
    1, CURRENT_DATE - INTERVAL '5 days', 5, 'COMPLETED'::cycle_count_status, 1, 1,
    14.00, NOW() - INTERVAL '5 days 5 hours', NOW() - INTERVAL '5 days 3 hours', NOW() - INTERVAL '5 days 2 hours',
    'Full count finished with minor overstock.', 3, 3
),
-- Count 5: Not Started
(
    1, CURRENT_DATE + INTERVAL '2 days', 6, 'NOT STARTED'::cycle_count_status, NULL, NULL,
    0.00, NULL, NULL, NULL,
    'Scheduled for Thursday morning.', 4, 0
);

-- 2. Cycle Count Items
-- Items for Count 1 (Category 2: Products 1, 16, 31, 46, 61)
INSERT INTO cycle_count_items (count_id, product_id, expected_qty, counted_qty, variance_cost, reason_code, scanned_at, scanned_by) VALUES
(1, 1, 15, 12, -33.00, 'Suspected shrinkage / misplaced', NOW() - INTERVAL '50 minutes', 1),
(1, 16, 8, 8, 0.00, NULL, NOW() - INTERVAL '40 minutes', 1),
(1, 31, 20, 20, 0.00, NULL, NOW() - INTERVAL '30 minutes', 1),
(1, 46, 10, 0, 0.00, NULL, NULL, NULL),
(1, 61, 5, 0, 0.00, NULL, NULL, NULL);

-- Items for Count 2 (Category 3: Products 2, 17, 32, 47)
INSERT INTO cycle_count_items (count_id, product_id, expected_qty, counted_qty, variance_cost, reason_code, scanned_at, scanned_by) VALUES
(2, 2, 10, 8, -24.00, 'Damaged / unsorted stock', NOW() - INTERVAL '1 day 2 hours', 1),
(2, 17, 12, 12, 0.00, NULL, NOW() - INTERVAL '1 day 2 hours', 1),
(2, 32, 14, 14, 0.00, NULL, NOW() - INTERVAL '1 day 1 hour', 1),
(2, 47, 6, 6, 0.00, NULL, NOW() - INTERVAL '1 day 1 hour', 1);

-- Items for Count 3 (Category 4: Products 3, 18, 33, 48)
INSERT INTO cycle_count_items (count_id, product_id, expected_qty, counted_qty, variance_cost, reason_code, scanned_at, scanned_by) VALUES
(3, 3, 25, 25, 0.00, NULL, NOW() - INTERVAL '3 days 3 hours', 2),
(3, 18, 18, 18, 0.00, NULL, NOW() - INTERVAL '3 days 3 hours', 2),
(3, 33, 9, 9, 0.00, NULL, NOW() - INTERVAL '3 days 2 hours', 2),
(3, 48, 15, 15, 0.00, NULL, NOW() - INTERVAL '3 days 2 hours', 2);

-- Items for Count 4 (Category 5: Products 4, 19, 34)
INSERT INTO cycle_count_items (count_id, product_id, expected_qty, counted_qty, variance_cost, reason_code, scanned_at, scanned_by) VALUES
(4, 4, 10, 11, 14.00, 'Found extra unit during top stock binning', NOW() - INTERVAL '5 days 4 hours', 1),
(4, 19, 14, 14, 0.00, NULL, NOW() - INTERVAL '5 days 4 hours', 1),
(4, 34, 8, 8, 0.00, NULL, NOW() - INTERVAL '5 days 3 hours', 1);

-- Items for Count 5 (Category 6: Products 5, 20, 35, 50) - Not started yet
INSERT INTO cycle_count_items (count_id, product_id, expected_qty, counted_qty, variance_cost, reason_code, scanned_at, scanned_by) VALUES
(5, 5, 12, 0, 0.00, NULL, NULL, NULL),
(5, 20, 15, 0, 0.00, NULL, NULL, NULL),
(5, 35, 6, 0, 0.00, NULL, NULL, NULL),
(5, 50, 20, 0, 0.00, NULL, NULL, NULL);

-- 3. Cycle Count Schedule for Calendar View
INSERT INTO cycle_count_schedule (store_id, category_id, scheduled_date, created_by, cycle_count_id) VALUES
-- Past & Current week
(1, 5, CURRENT_DATE - INTERVAL '5 days', 1, 4),
(1, 4, CURRENT_DATE - INTERVAL '3 days', 1, 3),
(1, 3, CURRENT_DATE - INTERVAL '1 day', 1, 2),
(1, 2, CURRENT_DATE, 1, 1),
(1, 6, CURRENT_DATE + INTERVAL '2 days', 1, 5),
-- Upcoming weeks
(1, 7, CURRENT_DATE + INTERVAL '7 days', 1, NULL),
(1, 8, CURRENT_DATE + INTERVAL '9 days', 1, NULL),
(1, 9, CURRENT_DATE + INTERVAL '14 days', 1, NULL),
(1, 10, CURRENT_DATE + INTERVAL '16 days', 1, NULL),
(1, 11, CURRENT_DATE + INTERVAL '21 days', 1, NULL),
(1, 12, CURRENT_DATE + INTERVAL '23 days', 1, NULL);
