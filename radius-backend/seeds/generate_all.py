#!/usr/bin/env python3
"""
Master seed data generator orchestrator for Radius.
Runs all table seed generators in topological dependency order.
"""

import sys
import importlib
from pathlib import Path

# Add seeds directory to Python module search path
SEEDS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SEEDS_DIR))

GENERATOR_MODULES = [
    ("00_wipe_database", "00_wipe_database.sql", "Database Wipe / Truncate (Preserving Stores & Employees)"),
    ("02_mims_locations", "02_mims_locations_seed.sql", "MIMS Locations (Runtime Managed)"),
    ("03_categories", "03_categories_seed.sql", "Product Categories Catalog"),
    ("04_suppliers", "04_suppliers_seed.sql", "Wholesale Supplier Vendors"),
    ("05_products", "05_products_seed.sql", "Master Products Catalog"),
    ("06_product_suppliers", "06_product_suppliers_seed.sql", "Product-Supplier Cost & SKU Mappings"),
    ("07_inventory", "07_inventory_seed.sql", "Store Inventories & Stock Quantities"),
    ("08_preferred_members", "08_preferred_members_seed.sql", "Loyalty Preferred Members & Reward Tiers"),
    ("09_purchase_orders", "09_purchase_orders_seed.sql", "Vendor Purchase Orders & Line Items"),
    ("10_stock_transfers", "10_stock_transfers_seed.sql", "Store Stock Transfers & Transfer Items"),
    ("11_transactions", "11_transactions_seed.sql", "POS Register Transactions & Items"),
    ("12_online_orders", "12_online_orders_seed.sql", "BOPIS & STS Online Customer Orders & Items"),
    ("13_print_orders", "13_print_orders_seed.sql", "Print Services, Supplies, Orders & Items"),
    ("14_cycle_counts", "14_cycle_counts_seed.sql", "Cycle Count Audits, Variances & Schedules"),
]


def run_all(output_files: bool = True):
    print("=" * 70)
    print("  Radius Seed Data Generator - Orchestrator")
    print("=" * 70)
    print("Starting generation in dependency order...\n")

    generated_count = 0
    for mod_name, sql_file, description in GENERATOR_MODULES:
        try:
            mod = importlib.import_module(mod_name)
            if hasattr(mod, "main"):
                print(f"-> Generating {sql_file:<28} | {description}")
                mod.main(output_file=output_files)
                generated_count += 1
            else:
                print(f"WARN: Module {mod_name} missing main() function")
        except Exception as e:
            print(f"ERROR executing {mod_name}: {e}")
            raise

    print("\n" + "=" * 70)
    print(f"Successfully generated {generated_count} seed SQL files in {SEEDS_DIR}")
    print("=" * 70)


if __name__ == "__main__":
    run_all(output_files=True)
