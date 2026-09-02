#!/usr/bin/env python3
"""
Generator for 02_mims_locations_seed.sql
Generates standard warehouse and backroom MIMS bin locations for stores.
Adheres to chk_mims_location_format: '^[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{3}$'
"""

import sys
from pathlib import Path

# Add seeds directory to Python module search path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    ALL_STORE_IDS,
    build_batched_inserts,
    escape_sql,
    write_sql_file,
)


def generate_sql() -> str:
    rows = []

    for store_id in ALL_STORE_IDS:
        start_aisle = (store_id - 1) * 5 + 1
        end_aisle = store_id * 5

        for aisle in range(start_aisle, end_aisle + 1):
            for bay in range(1, 6):
                for shelf in range(1, 4):
                    loc_id = f"{aisle:02d}-{bay:02d}-{shelf:02d}-001"
                    rows.append(f"({escape_sql(loc_id)}, {store_id})")

    inserts = build_batched_inserts(
        table="mims_location",
        columns="mims_location_id, store_id",
        rows=rows,
        on_conflict="ON CONFLICT (mims_location_id) DO NOTHING",
    )

    return f"""-- ==============================================================================
-- 02_mims_locations_seed.sql
-- Backroom, Top-Stock, and Overstock MIMS Bin Locations
-- Format: [Aisle:2]-[Bay:2]-[Shelf:2]-[Position:3] (e.g. 01-02-01-001)
-- ==============================================================================

TRUNCATE TABLE mims_location_items, mims_location RESTART IDENTITY CASCADE;

{inserts}
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("02_mims_locations_seed.sql", sql)
        total_locations = len(ALL_STORE_IDS) * 5 * 5 * 3
        print(f"Generated {out_path.name} ({total_locations} MIMS bin locations across {len(ALL_STORE_IDS)} stores)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
