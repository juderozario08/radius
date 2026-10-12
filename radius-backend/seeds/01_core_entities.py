#!/usr/bin/env python3
"""
Generator for 01_core_entities_seed.sql
Creates the stores and default employees the other seeds reference, only when they are missing.
"""

import os
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import escape_sql, write_sql_file

STORES = [
    (1, "Radius Toronto Downtown", "123 King Street W", "Toronto", "Ontario", "M5H 1J9", "4161234567", "America/Toronto", "STORE", "Eastern Canada"),
    (2, "Radius Vancouver Granville", "798 Granville Street", "Vancouver", "British Columbia", "V6Z 1K3", "6041234567", "America/Vancouver", "STORE", "Western Canada"),
    (3, "Eastern Distribution Center", "500 Logistics Drive", "Brampton", "Ontario", "L6T 5W4", "9059998888", "America/Toronto", "WAREHOUSE", "Eastern Canada"),
    (4, "Radius Montreal Downtown", "465 Saint-Jean St", "Montreal", "Quebec", "H2Y 2R6", "5141234567", "America/Toronto", "STORE", "Eastern Canada"),
    (5, "Radius Calgary Macleod", "900 Macleod Trail", "Calgary", "Alberta", "T2G 2M6", "4032345678", "America/Edmonton", "STORE", "Western Canada"),
    (6, "Radius Halifax Shopping Centre", "7001 Mumford Rd", "Halifax", "Nova Scotia", "B3L 4N9", "9021234567", "America/Halifax", "STORE", "Eastern Canada"),
    (7, "Radius Ottawa Rideau", "50 Rideau St", "Ottawa", "Ontario", "K1N 9J7", "6131234567", "America/Toronto", "STORE", "Eastern Canada"),
]

EMPLOYEES = [
    (1, "admin@radius.dev", 1, "Demo", "Admin", "ADMIN", "4165550190"),
    (2, "manager@radius.dev", 2, "Demo", "Manager", "MANAGER", "4165550191"),
    (3, "sales@radius.dev", 2, "Demo", "Sales", "SALES", "4165550192"),
    (4, "service@radius.dev", 2, "Demo", "Service", "SERVICE", "4165550193"),
]


def seed_password() -> str:
    password = os.environ.get("SEED_EMPLOYEE_PASSWORD", "")
    if password:
        return password
    password = secrets.token_urlsafe(12)
    print(f"SEED_EMPLOYEE_PASSWORD not set; seed employees that get created will use password: {password}")
    return password


def generate_sql(password: str) -> str:
    store_rows = ",\n".join(
        "(" + ", ".join(escape_sql(v) for v in row[:8]) + f", {escape_sql(row[8])}::location_type, {escape_sql(row[9])})"
        for row in STORES
    )
    employee_rows = ",\n".join(
        f"({emp_id}, {escape_sql(email)}, {store_id}, {escape_sql(first)}, {escape_sql(last)}, {escape_sql(role)}::employee_roles, "
        f"crypt({escape_sql(password)}, gen_salt('bf', 10)), {escape_sql(phone)}, '123 Main Street', 'Toronto', 'Ontario', 'M5V2K7')"
        for emp_id, email, store_id, first, last, role, phone in EMPLOYEES
    )
    return f"""-- ==============================================================================
-- 01_core_entities_seed.sql
-- Stores and default employees, inserted only when missing
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO stores (store_id, name, address, city, province, postal_code, phone, timezone, location_type, region)
OVERRIDING SYSTEM VALUE VALUES
{store_rows}
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('stores', 'store_id'), GREATEST((SELECT MAX(store_id) FROM stores), 1));

INSERT INTO employees (employee_id, email, store_id, first_name, last_name, role, password_hash, phone, address, city, province, postal_code)
OVERRIDING SYSTEM VALUE VALUES
{employee_rows}
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('employees', 'employee_id'), GREATEST((SELECT MAX(employee_id) FROM employees), 1));
"""


def main(output_file: bool = True):
    sql = generate_sql(seed_password())
    if output_file:
        out_path = write_sql_file("01_core_entities_seed.sql", sql)
        print(f"Generated {out_path.name} ({len(STORES)} stores, {len(EMPLOYEES)} employees when missing)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
