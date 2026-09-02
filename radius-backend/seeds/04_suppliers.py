#!/usr/bin/env python3
"""
Generator for 04_suppliers_seed.sql
Generates wholesale supplier vendors.
"""

import re
import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_SUPPLIERS,
    SUPPLIERS_LIST,
    random_phone,
    escape_sql,
    write_sql_file,
    build_batched_inserts,
    fake,
)


def generate_sql(num_suppliers: int = NUM_SUPPLIERS) -> str:
    rows = []
    seen_names = set()

    for i in range(num_suppliers):
        if i < len(SUPPLIERS_LIST):
            supp = SUPPLIERS_LIST[i]
            name = supp["name"]
            email = supp["email"]
            phone = supp["phone"]
            lead_time = supp["lead_time"]
            seen_names.add(name)
        else:
            comp = fake.company() if fake else f"Vendor {i + 1}"
            name = f"{comp} Distribution"
            if name in seen_names:
                name = f"{comp} {i + 1} Distribution"
            seen_names.add(name)

            slug = re.sub(r"[^a-z0-9]", "", comp.lower())[:30]
            email = f"orders@{slug}.ca"
            phone = random_phone("1-800")
            lead_time = random.randint(3, 8)

        row_str = f"({escape_sql(name)}, {escape_sql(email)}, {escape_sql(phone)}, {lead_time})"
        rows.append(row_str)

    inserts_sql = build_batched_inserts("suppliers", "name, contact_email, phone, lead_time_days", rows)

    return f"""-- ==============================================================================
-- 04_suppliers_seed.sql
-- Wholesale supplier vendors for purchasing and replenishment
-- ==============================================================================

TRUNCATE TABLE suppliers RESTART IDENTITY CASCADE;

{inserts_sql}
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("04_suppliers_seed.sql", sql)
        print(f"Generated {out_path.name} ({NUM_SUPPLIERS} suppliers)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
