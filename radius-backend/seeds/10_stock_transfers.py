#!/usr/bin/env python3
"""
Generator for 10_stock_transfers_seed.sql
Generates inter-store stock transfers and transfer item manifests.
"""

import sys
import random
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_STOCK_TRANSFERS,
    NUM_PRODUCTS,
    DEFAULT_EMPLOYEE_IDS,
    random_timestamp,
    escape_sql,
    write_sql_file,
)

TRANSFER_STATUSES = ["IN_TRANSIT", "PENDING", "RECEIVED", "CANCELLED", "IN_TRANSIT"]


def generate_sql(num_transfers: int = NUM_STOCK_TRANSFERS) -> str:
    transfer_rows = []
    item_rows = []

    for transfer_id in range(1, num_transfers + 1):
        if transfer_id % 2 == 1:
            from_store, to_store = 1, 2
        else:
            from_store, to_store = 2, 1

        status = TRANSFER_STATUSES[(transfer_id - 1) % len(TRANSFER_STATUSES)]
        requested_by = DEFAULT_EMPLOYEE_IDS[(transfer_id - 1) % len(DEFAULT_EMPLOYEE_IDS)]
        
        created_dt = random_timestamp(start_days_ago=45, end_days_ago=2)
        created_str = f"'{created_dt.strftime('%Y-%m-%d %H:%M:%S')}'"

        if status == "RECEIVED":
            received_dt = created_dt + timedelta(days=random.randint(1, 3), hours=random.randint(1, 12))
            received_str = f"'{received_dt.strftime('%Y-%m-%d %H:%M:%S')}'"
        else:
            received_str = "NULL"

        transfer_rows.append(
            f"({from_store}, {to_store}, {escape_sql(status)}, {requested_by}, {created_str}, {received_str})"
        )

        num_items = random.randint(1, 3)
        chosen_prods = random.sample(range(1, NUM_PRODUCTS + 1), num_items)
        for prod_id in chosen_prods:
            qty_req = random.choice([10, 15, 20, 30, 50])
            if status == "PENDING":
                qty_sent, qty_rec = 0, 0
            elif status == "IN_TRANSIT":
                qty_sent, qty_rec = qty_req, 0
            elif status == "RECEIVED":
                qty_sent, qty_rec = qty_req, qty_req
            else:  # CANCELLED
                qty_sent, qty_rec = 0, 0

            item_rows.append(f"({transfer_id}, {prod_id}, {qty_req}, {qty_sent}, {qty_rec})")

    transfer_values_str = ",\n".join(transfer_rows)
    items_values_str = ",\n".join(item_rows)

    return f"""-- ==============================================================================
-- 10_stock_transfers_seed.sql
-- Inter-store and warehouse stock transfer manifests
-- ==============================================================================

ALTER TABLE stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_requested_by_fkey;

TRUNCATE TABLE stock_transfer_items, stock_transfers RESTART IDENTITY CASCADE;

INSERT INTO stock_transfers (from_store_id, to_store_id, status, requested_by, created_at, received_at) VALUES
{transfer_values_str};

INSERT INTO stock_transfer_items (transfer_id, product_id, qty_requested, qty_sent, qty_received) VALUES
{items_values_str};

ALTER TABLE stock_transfers ADD CONSTRAINT stock_transfers_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES employees(employee_id) NOT VALID;
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("10_stock_transfers_seed.sql", sql)
        print(f"Generated {out_path.name} ({NUM_STOCK_TRANSFERS} stock transfers)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
