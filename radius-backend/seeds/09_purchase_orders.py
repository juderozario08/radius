#!/usr/bin/env python3
"""
Generator for 09_purchase_orders_seed.sql
Generates purchase orders and line items across stores and suppliers.
"""

import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_PURCHASE_ORDERS,
    NUM_SUPPLIERS,
    NUM_PRODUCTS,
    RETAIL_STORE_IDS,
    DEFAULT_EMPLOYEE_IDS,
    escape_sql,
    write_sql_file,
    build_batched_inserts,
)

PO_STATUSES = ["RECEIVED", "RECEIVED", "SHIPPED", "DELIVERING", "DELIVERED", "PARTIAL", "DRAFT"]


def generate_sql(num_pos: int = NUM_PURCHASE_ORDERS) -> str:
    po_rows = []
    item_rows = []

    for po_id in range(1, num_pos + 1):
        store_id = random.choice(RETAIL_STORE_IDS)
        supplier_id = random.randint(1, NUM_SUPPLIERS)
        status = random.choice(PO_STATUSES)
        created_by = random.choice(DEFAULT_EMPLOYEE_IDS)

        days_ago = random.randint(2, 90)
        ordered_expr = f"NOW() - INTERVAL '{days_ago} days'"
        expected_expr = f"NOW() + INTERVAL '2 days'"

        if status in ("RECEIVED", "DELIVERED"):
            arrived_expr = f"NOW() - INTERVAL '{random.randint(1, 48)} hours'"
        else:
            arrived_expr = "NULL"

        po_rows.append(
            f"({store_id}, {supplier_id}, {escape_sql(status)}, {ordered_expr}, {expected_expr}, {arrived_expr}, {created_by})"
        )

        # 2 to 4 items per PO
        num_items = random.randint(2, 4)
        chosen_products = random.sample(range(1, NUM_PRODUCTS + 1), num_items)
        for prod_id in chosen_products:
            qty_ordered = random.choice([10, 15, 20, 25, 30, 50])
            unit_cost = round(random.uniform(10.0, 65.0), 2)
            item_rows.append(f"({po_id}, {prod_id}, {qty_ordered}, {unit_cost:.2f})")

    po_inserts = build_batched_inserts(
        "purchase_orders",
        "store_id, supplier_id, status, ordered_at, expected_at, arrived_at, created_by",
        po_rows,
    )

    items_inserts = build_batched_inserts(
        "purchase_orders_items",
        "po_id, product_id, qty_ordered, unit_cost",
        item_rows,
    )

    return f"""-- ==============================================================================
-- 09_purchase_orders_seed.sql
-- Inbound vendor purchase orders and item manifests
-- ==============================================================================

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_created_by_fkey;

TRUNCATE TABLE purchase_orders_items, purchase_orders, purchase_order_lpr_items, purchase_order_lprs RESTART IDENTITY CASCADE;

{po_inserts}

{items_inserts}

ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES employees(employee_id) NOT VALID;
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("09_purchase_orders_seed.sql", sql)
        print(f"Generated {out_path.name} ({NUM_PURCHASE_ORDERS} purchase orders)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
