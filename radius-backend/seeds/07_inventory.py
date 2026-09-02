#!/usr/bin/env python3
"""
Generator for 07_inventory_seed.sql
Generates store inventory records with sub-inventory buckets, aisles,
and MIMS warehouse bin location items across all 7 stores x 10,000 products.
"""

import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_PRODUCTS,
    ALL_STORE_IDS,
    escape_sql,
    write_sql_file,
    build_batched_inserts,
)

AISLES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "D1", "D2", "E1", "E2", "F1", "F2"]

INVENTORY_COLUMNS = (
    "store_id, product_id, reserved_qty, reorder_point, reorder_qty, "
    "aisle, mims_location, open_box_qty, new_qty, rtv_qty, code88_qty, "
    "bopis_qty, quarantine_qty, repair_qty, customer_on_hold_qty, "
    "fc_on_hold_qty, verify_qty, demo_qty, on_order_qty"
)

MIMS_COLUMNS = "mims_location_id, store_id, inventory_id, quantity, location_type"


def generate_sql(num_products: int = NUM_PRODUCTS, store_ids: list = None) -> str:
    if store_ids is None:
        store_ids = ALL_STORE_IDS

    inv_rows = []
    mims_item_rows = []
    current_inv_id = 1

    for store_id in store_ids:
        # Generate store-specific MIMS bin pools:
        # Store 1: Aisles 01-05, Store 2: Aisles 06-10, Store 3: Aisles 11-15, etc.
        # Each aisle has bays 01-05, shelves 01-03, position 001.
        aisle_start = (store_id - 1) * 5 + 1
        aisle_end = store_id * 5
        store_bins = [
            f"{a:02d}-{b:02d}-{s:02d}-001"
            for a in range(aisle_start, aisle_end + 1)
            for b in range(1, 6)
            for s in range(1, 4)
        ]

        for product_idx in range(1, num_products + 1):
            reserved_qty = random.choice([0, 0, 0, 1, 2])
            reorder_point = random.choice([5, 8, 10, 15])
            reorder_qty = random.choice([10, 15, 20, 24, 30])
            aisle = AISLES[(product_idx - 1) % len(AISLES)]

            open_box_qty = random.choice([0, 0, 0, 0, 1])
            # Generates realistic active stock between 8 and 45
            new_qty = random.randint(8, 45)
            rtv_qty = 0
            code88_qty = 0
            bopis_qty = random.choice([0, 0, 0, 1])
            quarantine_qty = 0
            repair_qty = 0
            customer_on_hold_qty = 0
            fc_on_hold_qty = 0
            verify_qty = 0
            demo_qty = random.choice([0, 1, 2])
            on_order_qty = random.choice([0, 0, 0, 5, 10])

            # Select a primary MIMS bin location for roughly 60% of items
            has_primary_bin = (random.random() < 0.60)
            primary_bin = store_bins[(product_idx - 1) % len(store_bins)] if has_primary_bin else None

            inv_row_str = (
                f"({store_id}, {product_idx}, {reserved_qty}, {reorder_point}, {reorder_qty}, "
                f"{escape_sql(aisle)}, {escape_sql(primary_bin)}, {open_box_qty}, {new_qty}, "
                f"{rtv_qty}, {code88_qty}, {bopis_qty}, {quarantine_qty}, {repair_qty}, "
                f"{customer_on_hold_qty}, {fc_on_hold_qty}, {verify_qty}, {demo_qty}, {on_order_qty})"
            )
            inv_rows.append(inv_row_str)

            # Keep MIMS binned quantity in check: sum(binned) <= new_qty
            if primary_bin and new_qty >= 10:
                overstock_qty = random.randint(4, new_qty - 4)
                mims_item_rows.append(
                    f"({escape_sql(primary_bin)}, {store_id}, {current_inv_id}, {overstock_qty}, 'OVERSTOCK')"
                )

                # Optional secondary Top-Stock bin for 40% of primary-binned items if enough qty remains
                remaining_qty = new_qty - overstock_qty
                if remaining_qty >= 6 and random.random() < 0.40:
                    top_stock_bin = store_bins[(product_idx + 2) % len(store_bins)]
                    if top_stock_bin != primary_bin:
                        top_qty = random.randint(2, remaining_qty - 2)
                        mims_item_rows.append(
                            f"({escape_sql(top_stock_bin)}, {store_id}, {current_inv_id}, {top_qty}, 'TOP_STOCK')"
                        )

            current_inv_id += 1

    inv_batched = build_batched_inserts("inventory", INVENTORY_COLUMNS, inv_rows)
    mims_batched = build_batched_inserts("mims_location_items", MIMS_COLUMNS, mims_item_rows) if mims_item_rows else ""

    sql_parts = [
        "-- ==============================================================================",
        "-- 07_inventory_seed.sql",
        "-- Store inventory stock levels and location mappings",
        "-- ==============================================================================",
        "",
        "TRUNCATE TABLE mims_location_items, inventory RESTART IDENTITY CASCADE;",
        "",
        inv_batched,
    ]

    if mims_batched:
        sql_parts.extend([
            "",
            "-- ==============================================================================",
            "-- MIMS Location Inventory Items (Quantities strictly verified <= new_qty)",
            "-- ==============================================================================",
            "",
            mims_batched,
        ])

    return "\n".join(sql_parts) + "\n"


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("07_inventory_seed.sql", sql)
        total_records = len(ALL_STORE_IDS) * NUM_PRODUCTS
        print(f"Generated {out_path.name} ({total_records} inventory records + MIMS items across {len(ALL_STORE_IDS)} stores)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
