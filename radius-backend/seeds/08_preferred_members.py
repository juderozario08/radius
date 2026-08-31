#!/usr/bin/env python3
"""
Generator for 08_preferred_members_seed.sql
Generates customer loyalty and preferred member accounts.
"""

import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_PREFERRED_MEMBERS,
    FIRST_NAMES,
    LAST_NAMES,
    random_email,
    random_phone,
    random_date,
    escape_sql,
    write_sql_file,
)

TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM"]


def generate_sql(num_members: int = NUM_PREFERRED_MEMBERS) -> str:
    rows = []
    used_emails = set()
    used_phones = set()

    for i in range(num_members):
        first = FIRST_NAMES[i % len(FIRST_NAMES)]
        last = LAST_NAMES[(i * 3 + 7) % len(LAST_NAMES)]
        
        # Ensure unique email
        email = random_email(first, last)
        counter = 1
        while email in used_emails:
            email = random_email(first, f"{last}{counter}")
            counter += 1
        used_emails.add(email)

        # Ensure unique phone
        phone = random_phone()
        while phone in used_phones:
            phone = random_phone()
        used_phones.add(phone)

        is_active = True
        joined_date = random_date(start_days_ago=1000, end_days_ago=30).isoformat()
        tier = random.choices(TIERS, weights=[40, 30, 20, 10])[0]
        points = random.randint(100, 5000) if tier != "BRONZE" else random.randint(0, 500)

        row_str = (
            f"({escape_sql(first)}, {escape_sql(last)}, {escape_sql(email)}, "
            f"{escape_sql(phone)}, {escape_sql(is_active)}, {escape_sql(joined_date)}, "
            f"{escape_sql(tier)}, {points})"
        )
        rows.append(row_str)

    values_str = ",\n".join(rows)
    return f"""-- ==============================================================================
-- 08_preferred_members_seed.sql
-- Preferred customer loyalty members and reward tiers
-- ==============================================================================

TRUNCATE TABLE preferred_members RESTART IDENTITY CASCADE;

INSERT INTO preferred_members (first_name, last_name, email, phone, is_active, joined_date, tier_level, points_balance) VALUES
{values_str};
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
