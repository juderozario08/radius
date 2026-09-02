#!/usr/bin/env python3
"""
Generator for 08_preferred_members_seed.sql
Generates customer loyalty and preferred member accounts using Faker.
"""

import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_PREFERRED_MEMBERS,
    random_phone,
    random_date,
    escape_sql,
    write_sql_file,
    build_batched_inserts,
    fake,
)

TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM"]
EMAIL_DOMAINS = ["gmail.com", "outlook.com", "yahoo.ca", "rogers.com"]


def generate_sql(num_members: int = NUM_PREFERRED_MEMBERS) -> str:
    rows = []

    for i in range(1, num_members + 1):
        if fake:
            first = fake.first_name()
            last = fake.last_name()
        else:
            first = f"MemberFirst{i}"
            last = f"MemberLast{i}"

        clean_first = first.lower().replace("'", "").replace(" ", "").replace("-", "")
        clean_last = last.lower().replace("'", "").replace(" ", "").replace("-", "")
        email_domain = random.choice(EMAIL_DOMAINS)
        email = f"{clean_first}.{clean_last}{i}@{email_domain}"

        phone = random_phone()
        is_active = True
        joined_date = random_date(1000, 30)
        tier = random.choices(TIERS, weights=[40, 30, 20, 10])[0]
        points = random.randint(0, 500) if tier == "BRONZE" else random.randint(100, 5000)

        row_str = (
            f"({escape_sql(first)}, {escape_sql(last)}, {escape_sql(email)}, "
            f"{escape_sql(phone)}, {escape_sql(is_active)}, {escape_sql(joined_date)}, "
            f"{escape_sql(tier)}, {points})"
        )
        rows.append(row_str)

    columns = "first_name, last_name, email, phone, is_active, joined_date, tier_level, points_balance"
    inserts_sql = build_batched_inserts("preferred_members", columns, rows)

    return f"""-- ==============================================================================
-- 08_preferred_members_seed.sql
-- Preferred customer loyalty members and reward tiers
-- ==============================================================================

TRUNCATE TABLE preferred_members RESTART IDENTITY CASCADE;

{inserts_sql}
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("08_preferred_members_seed.sql", sql)
        print(f"Generated {out_path.name} ({NUM_PREFERRED_MEMBERS} preferred members)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
