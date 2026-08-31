#!/usr/bin/env python3
"""
Generator for 02_mims_locations_seed.sql
Generates standard warehouse and backroom MIMS bin locations for stores.
Adheres to chk_mims_location_format: '^[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{3}$'
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DEFAULT_STORE_IDS, escape_sql, write_sql_file


def generate_sql() -> str:
    rows = []
    
    # Store 1: Aisles 01 to 05
    for aisle in range(1, 6):
        for bay in range(1, 4):
            for shelf in range(1, 3):
                loc_id = f"{aisle:02d}-{bay:02d}-{shelf:02d}-001"
                rows.append(f"({escape_sql(loc_id)}, 1)")

    # Store 2: Aisles 06 to 10
    for aisle in range(6, 11):
        for bay in range(1, 4):
            for shelf in range(1, 3):
                loc_id = f"{aisle:02d}-{bay:02d}-{shelf:02d}-001"
                rows.append(f"({escape_sql(loc_id)}, 2)")

    values_str = ",\n".join(rows)

    return f"""-- ==============================================================================
-- 02_mims_locations_seed.sql
-- Backroom, Top-Stock, and Overstock MIMS Bin Locations
-- Format: [Aisle:2]-[Bay:2]-[Shelf:2]-[Position:3] (e.g. 01-02-01-001)
-- ==============================================================================

TRUNCATE TABLE mims_location_items, mims_location RESTART IDENTITY CASCADE;

INSERT INTO mims_location (mims_location_id, store_id) VALUES
{values_str}
ON CONFLICT (mims_location_id) DO NOTHING;
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("02_mims_locations_seed.sql", sql)
        print(f"Generated {out_path.name} (60 MIMS bin locations across 2 stores)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
