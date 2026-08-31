#!/usr/bin/env python3
"""
Generator for 14_cycle_counts_seed.sql
Generates physical inventory cycle counts, item variances, and audit calendar schedules.
"""

import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_CYCLE_COUNTS,
    NUM_CATEGORIES,
    NUM_PRODUCTS,
    DEFAULT_STORE_IDS,
    DEFAULT_EMPLOYEE_IDS,
    escape_sql,
    write_sql_file,
)

CYCLE_STATUSES = [
    ("IN PROGRESS", "Weekly category count in progress.", True, False, False),
    ("PENDING APPROVAL", "Category count completed. Discrepancy observed.", True, True, False),
    ("APPROVED", "Reconciled and verified by manager.", True, True, True),
    ("COMPLETED", "Full category count finished with minor variance.", True, True, True),
    ("NOT STARTED", "Scheduled for upcoming shift audit.", False, False, False),
]

REASON_CODES = [
    "Suspected shrinkage / misplaced",
    "Damaged / unsorted stock",
    "Found extra unit during top stock binning",
    "Mislabelled SKU facing",
]


def generate_sql(num_counts: int = NUM_CYCLE_COUNTS) -> str:
    count_rows = []
    item_rows = []
    schedule_rows = []

    for count_id in range(1, num_counts + 1):
        store_id = DEFAULT_STORE_IDS[(count_id - 1) % len(DEFAULT_STORE_IDS)]
        cat_id = ((count_id - 1) % NUM_CATEGORIES) + 1
        
        status_info = CYCLE_STATUSES[(count_id - 1) % len(CYCLE_STATUSES)]
        status, note_template, is_started, is_completed, is_approved = status_info
        
        counted_by = 1 if is_started else "NULL"
        approved_by = 2 if is_approved else "NULL"
        
        days_offset = (count_id - 1) * 2 - 4  # Mix of past, today, and future
        date_expr = f"CURRENT_DATE + INTERVAL '{days_offset} days'" if days_offset != 0 else "CURRENT_DATE"

        if is_started:
            started_expr = f"NOW() - INTERVAL '{count_id * 6} hours'"
        else:
            started_expr = "NULL"

        if is_completed:
            completed_expr = f"NOW() - INTERVAL '{count_id * 6 - 2} hours'"
        else:
            completed_expr = "NULL"

        if is_approved:
            approved_expr = f"NOW() - INTERVAL '{count_id * 6 - 3} hours'"
        else:
            approved_expr = "NULL"

        # Find products in this category (where (p - 1) % NUM_CATEGORIES + 1 == cat_id)
        matching_prods = [p for p in range(1, NUM_PRODUCTS + 1) if ((p - 1) % NUM_CATEGORIES) + 1 == cat_id]
        if not matching_prods:
            matching_prods = [cat_id]

        chosen_prods = matching_prods[:random.randint(3, 5)]
        total_items = len(chosen_prods)
        counted_items = total_items if is_completed else (len(chosen_prods) - 1 if is_started else 0)

        total_variance = 0.0

        for p_idx, prod_id in enumerate(chosen_prods):
            expected = random.randint(8, 25)
            if not is_started:
                counted = 0
                variance_cost = 0.00
                reason = "NULL"
                scan_expr = "NULL"
                scan_emp = "NULL"
            elif not is_completed and p_idx >= counted_items:
                counted = 0
                variance_cost = 0.00
                reason = "NULL"
                scan_expr = "NULL"
                scan_emp = "NULL"
            else:
                diff = random.choice([0, 0, 0, -1, -2, 1])
                counted = max(0, expected + diff)
                unit_val = 12.50
                variance_cost = round(diff * unit_val, 2)
                total_variance += variance_cost
                reason = escape_sql(random.choice(REASON_CODES)) if diff != 0 else "NULL"
                scan_expr = f"NOW() - INTERVAL '{50 - p_idx * 10} minutes'"
                scan_emp = "1"

            item_rows.append(
                f"({count_id}, {prod_id}, {expected}, {counted}, {variance_cost:.2f}, "
                f"{reason}, {scan_expr}, {scan_emp})"
            )

        notes = f"{note_template} Audit #{count_id:03d}."
        count_rows.append(
            f"({store_id}, {date_expr}, {cat_id}, {escape_sql(status)}::cycle_count_status, "
            f"{counted_by}, {approved_by}, {total_variance:.2f}, {started_expr}, "
            f"{completed_expr}, {approved_expr}, {escape_sql(notes)}, {total_items}, {counted_items})"
        )

        # Schedule row
        schedule_rows.append(
            f"({store_id}, {cat_id}, {date_expr}, 1, {count_id})"
        )

    # Add a few upcoming scheduled dates without linked cycle counts
    for extra in range(1, 4):
        future_cat = ((num_counts + extra) % NUM_CATEGORIES) + 1
        future_days = 7 + extra * 3
        schedule_rows.append(
            f"(1, {future_cat}, CURRENT_DATE + INTERVAL '{future_days} days', 1, NULL)"
        )

    counts_sql = ",\n".join(count_rows)
    items_sql = ",\n".join(item_rows)
    schedule_sql = ",\n".join(schedule_rows)

    return f"""-- ==============================================================================
-- 14_cycle_counts_seed.sql
-- Physical inventory cycle counts, item variances, and scheduled calendar audits
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
{counts_sql};

-- 2. Cycle Count Items
INSERT INTO cycle_count_items (count_id, product_id, expected_qty, counted_qty, variance_cost, reason_code, scanned_at, scanned_by) VALUES
{items_sql};

-- 3. Cycle Count Schedule for Calendar View
INSERT INTO cycle_count_schedule (store_id, category_id, scheduled_date, created_by, cycle_count_id) VALUES
{schedule_sql};
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("14_cycle_counts_seed.sql", sql)
        print(f"Generated {out_path.name} ({NUM_CYCLE_COUNTS} cycle count audits)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
