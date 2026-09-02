#!/usr/bin/env python3
"""
Generator for 00_wipe_database.sql
Wipes all dynamic application data while preserving core tables (Stores, Employees).
"""

import sys
from pathlib import Path

# Add parent directory to path if run standalone
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import write_sql_file

WIPED_TABLES = [
    "categories",
    "suppliers",
    "products",
    "product_suppliers",
    "mims_location",
    "inventory",
    "mims_location_items",
    "fill_reports",
    "fill_report_items",
    "transactions",
    "transaction_items",
    "online_orders",
    "online_order_items",
    "cycle_counts",
    "cycle_count_items",
    "cycle_count_schedule",
    "inventory_transactions",
    "preferred_members",
    "purchase_orders",
    "purchase_orders_items",
    "purchase_order_lprs",
    "purchase_order_lpr_items",
    "stock_transfers",
    "stock_transfer_items",
    "mims_scan_log",
    "print_orders",
    "print_order_items",
]


def generate_sql() -> str:
    tables_formatted = ",\n    ".join(WIPED_TABLES)
    sql = f"""-- ==============================================================================
-- 00_wipe_database.sql
-- Completely wipes all dynamic table data and restarts IDs (Preserves Stores & Employees)
-- ==============================================================================

TRUNCATE TABLE 
    {tables_formatted}
RESTART IDENTITY CASCADE;
"""
    return sql


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("00_wipe_database.sql", sql)
        print(f"Generated {out_path.name}")
    else:
        print(sql)


if __name__ == "__main__":
    main()
