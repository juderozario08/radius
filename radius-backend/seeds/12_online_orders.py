#!/usr/bin/env python3
"""
Generator for 12_online_orders_seed.sql
Generates BOPIS and Ship-to-Store (STS) online customer orders and items.
"""

import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_ONLINE_ORDERS,
    NUM_PRODUCTS,
    RETAIL_STORE_IDS,
    STREET_NAMES,
    CANADIAN_CITIES,
    escape_sql,
    write_sql_file,
    build_batched_inserts,
    fake,
)

BOPIS_STATUSES = ["READY FOR PICKUP", "AWAITING PICKUP", "RELEASED", "WORK IN PROGRESS"]
STS_STATUSES = ["WORK IN PROGRESS", "SHIPPED", "DELIVERING", "DELIVERED", "AWAITING PICKUP", "RELEASED"]


def generate_sql(num_orders: int = NUM_ONLINE_ORDERS) -> str:
    order_rows = []
    item_rows = []

    for order_id in range(1, num_orders + 1):
        store_id = random.choice(RETAIL_STORE_IDS)
        order_type = "BOPIS" if order_id % 2 == 1 else "STS"

        if fake:
            first = fake.first_name()
            last = fake.last_name()
        else:
            first = f"Customer{order_id}"
            last = f"Order{order_id}"

        full_name = f"{first} {last}"
        domain = "bopis.com" if order_type == "BOPIS" else "sts.com"
        clean_first = first.lower().replace("'", "").replace(" ", "").replace("-", "")
        clean_last = last.lower().replace("'", "").replace(" ", "").replace("-", "")
        email = f"{clean_first}.{clean_last}{order_id}@{domain}"

        if order_type == "BOPIS":
            status = random.choice(BOPIS_STATUSES)
            shipping_fee = 0.00
            shipping_address = "Store Pickup Counter"
            alt_pickup = (
                f"{fake.first_name()} {fake.last_name()}"
                if (fake and random.random() < 0.15)
                else None
            )
        else:
            status = random.choice(STS_STATUSES)
            shipping_fee = random.choice([0.00, 5.99, 9.99, 14.99])
            street_num = random.randint(10, 9999)
            street = random.choice(STREET_NAMES)
            city, prov, postal = random.choice(CANADIAN_CITIES)
            shipping_address = f"{street_num} {street}, {city}, {prov} {postal}"
            alt_pickup = None

        # 1 to 3 items per order
        num_items = random.randint(1, 3)
        chosen_prods = random.sample(range(1, NUM_PRODUCTS + 1), num_items)

        subtotal = 0.0
        for prod_id in chosen_prods:
            qty = random.choice([1, 1, 2])
            unit_price = round(random.uniform(19.99, 99.99), 2)
            subtotal += unit_price * qty
            item_rows.append(f"({order_id}, {prod_id}, {qty}, {unit_price:.2f})")

        tax_amount = round(subtotal * 0.13, 2)
        total_amount = round(subtotal + tax_amount + shipping_fee, 2)

        order_rows.append(
            f"({store_id}, {escape_sql(email)}, {escape_sql(full_name)}, {subtotal:.2f}, "
            f"{tax_amount:.2f}, {shipping_fee:.2f}, {total_amount:.2f}, {escape_sql(status)}, "
            f"{escape_sql(order_type)}, {escape_sql(alt_pickup)}, {escape_sql(shipping_address)})"
        )

    order_columns = (
        "store_id, customer_email, customer_name, subtotal, tax_amount, "
        "shipping_fee, total_amount, status, order_type, alternate_pickup_person, shipping_address"
    )
    order_inserts = build_batched_inserts("online_orders", order_columns, order_rows)

    item_columns = "order_id, product_id, quantity, unit_price"
    item_inserts = build_batched_inserts("online_order_items", item_columns, item_rows)

    return f"""-- ==============================================================================
-- 12_online_orders_seed.sql
-- BOPIS (Pickup) and STS (Delivery/Shipping) online ecommerce customer orders
-- ==============================================================================

TRUNCATE TABLE online_order_items, online_orders RESTART IDENTITY CASCADE;

{order_inserts}

{item_inserts}
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("12_online_orders_seed.sql", sql)
        print(f"Generated {out_path.name} ({NUM_ONLINE_ORDERS} online orders)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
