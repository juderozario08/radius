#!/usr/bin/env python3
"""
Generator for 04_suppliers_seed.sql
Generates wholesale supplier vendors.
"""

import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_SUPPLIERS,
    SUPPLIERS_LIST,
    COMPANY_NAMES,
    random_phone,
    escape_sql,
    write_sql_file,
)


def generate_sql(num_suppliers: int = NUM_SUPPLIERS) -> str:
    rows = []
    
    for i in range(num_suppliers):
        if i < len(SUPPLIERS_LIST):
            supp = SUPPLIERS_LIST[i]
            name = supp["name"]
            email = supp["email"]
            phone = supp["phone"]
            lead_time = supp["lead_time"]
        else:
            name = f"{random.choice(COMPANY_NAMES)} Corp"
            slug = name.lower().replace(" ", "").replace("&", "")
            email = f"orders@{slug}.ca"
            phone = random_phone("1-800")
            lead_time = random.randint(3, 8)

        row_str = f"({escape_sql(name)}, {escape_sql(email)}, {escape_sql(phone)}, {lead_time})"
        rows.append(row_str)

    values_str = ",\n".join(rows)
    return f"""-- ==============================================================================
-- 04_suppliers_seed.sql
-- Supplier vendors for purchasing and replenishment
-- ==============================================================================

INSERT INTO suppliers (name, contact_email, phone, lead_time_days) VALUES
{values_str};
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
