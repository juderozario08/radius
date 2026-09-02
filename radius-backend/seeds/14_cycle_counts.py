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
    RETAIL_STORE_IDS,
    DEFAULT_EMPLOYEE_IDS,
    escape_sql,
    write_sql_file,
    build_batched_inserts,
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
    # Pre-index products by category to avoid redundant scans
    category_products = {cat: [] for cat in range(1, NUM_CATEGORIES + 1)}
    for prod_id in range(1, NUM_PRODUCTS + 1):
        cat = ((prod_id - 1) % NUM_CATEGORIES) + 1
        category_products[cat].append(prod_id)

    count_rows = []
    item_rows = []
    schedule_rows = []

    for count_id in range(1, num_counts + 1):
        store_id = random.choice(RETAIL_STORE_IDS)
        cat_id = ((count_id - 1) % NUM_CATEGORIES) + 1

        status_info = CYCLE_STATUSES[(count_id - 1) % len(CYCLE_STATUSES)]
        status, note_template, is_started, is_completed, is_approved = status_info

        counted_by = random.choice(DEFAULT_EMPLOYEE_IDS) if is_started else None
        approved_by = random.choice(DEFAULT_EMPLOYEE_IDS) if is_approved else None
        counted_by_expr = str(counted_by) if counted_by is not None else "NULL"
        approved_by_expr = str(approved_by) if approved_by is not None else "NULL"

        if status == "NOT STARTED":
            days_future = random.randint(0, 14)
            date_expr = f"CURRENT_DATE + INTERVAL '{days_future} days'" if days_future > 0 else "CURRENT_DATE"
            started_expr = "NULL"
            completed_expr = "NULL"
            approved_expr = "NULL"
            hours_ago = 0
        elif status == "IN PROGRESS":
            days_offset = random.choice([0, 0, -1])
            date_expr = "CURRENT_DATE" if days_offset == 0 else "CURRENT_DATE - INTERVAL '1 day'"
            hours_ago = random.randint(1, 5)
            started_expr = f"NOW() - INTERVAL '{hours_ago} hours'"
            completed_expr = "NULL"
            approved_expr = "NULL"
        elif status == "PENDING APPROVAL":
            days_ago = random.randint(0, 5)
            date_expr = "CURRENT_DATE" if days_ago == 0 else f"CURRENT_DATE - INTERVAL '{days_ago} days'"
            hours_ago = days_ago * 24 + random.randint(1, 6)
            started_expr = f"NOW() - INTERVAL '{hours_ago + 3} hours'"
            completed_expr = f"NOW() - INTERVAL '{hours_ago} hours'"
            approved_expr = "NULL"
        else:  # APPROVED, COMPLETED
            days_ago = random.randint(1, 90)
            date_expr = f"CURRENT_DATE - INTERVAL '{days_ago} days'"
            hours_ago = days_ago * 24 + random.randint(2, 8)
            started_expr = f"NOW() - INTERVAL '{hours_ago + 4} hours'"
            completed_expr = f"NOW() - INTERVAL '{hours_ago + 2} hours'"
            approved_expr = f"NOW() - INTERVAL '{hours_ago} hours'"

        # Find products in this category
        matching_prods = category_products[cat_id]
        num_items = random.randint(3, 5)
        chosen_prods = random.sample(matching_prods, min(len(matching_prods), num_items))
        total_items = len(chosen_prods)
        counted_items = total_items if is_completed else (max(1, total_items - 1) if is_started else 0)

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
                if status == "IN PROGRESS":
                    scan_expr = f"NOW() - INTERVAL '{max(5, 50 - p_idx * 10)} minutes'"
                else:
                    scan_expr = f"NOW() - INTERVAL '{hours_ago + 3} hours' + INTERVAL '{p_idx * 10 + 5} minutes'"
                scan_emp = str(counted_by)

            item_rows.append(
                f"({count_id}, {prod_id}, {expected}, {counted}, {variance_cost:.2f}, "
                f"{reason}, {scan_expr}, {scan_emp})"
            )

        notes = f"{note_template} Audit #{count_id:04d}."
        count_rows.append(
            f"({store_id}, {date_expr}, {cat_id}, {escape_sql(status)}::cycle_count_status, "
            f"{counted_by_expr}, {approved_by_expr}, {total_variance:.2f}, {started_expr}, "
            f"{completed_expr}, {approved_expr}, {escape_sql(notes)}, {total_items}, {counted_items})"
        )

        # Schedule row linked to count
        sched_creator = random.choice(DEFAULT_EMPLOYEE_IDS)
        schedule_rows.append(
            f"({store_id}, {cat_id}, {date_expr}, {sched_creator}, {count_id})"
        )

    # Add a few upcoming scheduled dates without linked cycle counts
    for extra in range(1, 6):
        extra_store = random.choice(RETAIL_STORE_IDS)
        future_cat = ((num_counts + extra) % NUM_CATEGORIES) + 1
        future_days = 3 + extra * 2
        sched_creator = random.choice(DEFAULT_EMPLOYEE_IDS)
        schedule_rows.append(
            f"({extra_store}, {future_cat}, CURRENT_DATE + INTERVAL '{future_days} days', {sched_creator}, NULL)"
        )

    counts_inserts = build_batched_inserts(
        "cycle_counts",
        "store_id, count_date, category_id, status, counted_by, approved_by, "
        "total_variance_cost, started_at, completed_at, approved_at, notes, total_items, counted_items",
        count_rows,
    )

    items_inserts = build_batched_inserts(
        "cycle_count_items",
        "count_id, product_id, expected_qty, counted_qty, variance_cost, reason_code, scanned_at, scanned_by",
        item_rows,
    )

    schedule_inserts = build_batched_inserts(
        "cycle_count_schedule",
        "store_id, category_id, scheduled_date, created_by, cycle_count_id",
        schedule_rows,
    )

    return f"""-- ==============================================================================
-- 14_cycle_counts_seed.sql
-- Physical inventory cycle counts, item variances, and scheduled calendar audits
-- ==============================================================================

ALTER TABLE cycle_counts DROP CONSTRAINT IF EXISTS cycle_counts_counted_by_fkey;
ALTER TABLE cycle_counts DROP CONSTRAINT IF EXISTS cycle_counts_approved_by_fkey;
ALTER TABLE cycle_count_items DROP CONSTRAINT IF EXISTS cycle_count_items_scanned_by_fkey;
ALTER TABLE cycle_count_schedule DROP CONSTRAINT IF EXISTS cycle_count_schedule_created_by_fkey;

TRUNCATE TABLE 
    cycle_count_schedule,
    cycle_count_items,
    cycle_counts
RESTART IDENTITY CASCADE;

-- 1. Cycle Counts
{counts_inserts}

-- 2. Cycle Count Items
{items_inserts}

-- 3. Cycle Count Schedule for Calendar View
{schedule_inserts}

ALTER TABLE cycle_counts ADD CONSTRAINT cycle_counts_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES employees(employee_id) NOT VALID;
ALTER TABLE cycle_counts ADD CONSTRAINT cycle_counts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES employees(employee_id) NOT VALID;
ALTER TABLE cycle_count_items ADD CONSTRAINT cycle_count_items_scanned_by_fkey FOREIGN KEY (scanned_by) REFERENCES employees(employee_id) NOT VALID;
ALTER TABLE cycle_count_schedule ADD CONSTRAINT cycle_count_schedule_created_by_fkey FOREIGN KEY (created_by) REFERENCES employees(employee_id) NOT VALID;
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
