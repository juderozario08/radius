#!/usr/bin/env python3
"""
Generator for 03_categories_seed.sql
Generates retail and office product categories.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import CATEGORIES_LIST, escape_sql, write_sql_file


def generate_sql() -> str:
    rows = []
    for cat_name in CATEGORIES_LIST:
        rows.append(f"({escape_sql(cat_name)})")

    values_str = ",\n".join(rows)
    return f"""-- ==============================================================================
-- 03_categories_seed.sql
-- Product categories catalog
-- ==============================================================================

INSERT INTO categories (name) VALUES
{values_str};
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("03_categories_seed.sql", sql)
        print(f"Generated {out_path.name} ({len(CATEGORIES_LIST)} categories)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
