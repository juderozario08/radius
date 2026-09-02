#!/usr/bin/env python3
"""
Generator for 13_print_orders_seed.sql
Generates customer print orders and line items.
"""

import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_PRINT_ORDERS,
    RETAIL_STORE_IDS,
    random_phone,
    escape_sql,
    write_sql_file,
    build_batched_inserts,
    fake,
)

PRINT_SERVICES = [
    ("Standard B&W Printing (Letter)", "Single-sided 20lb white bond paper", "DOCUMENT_PRINTING", 0.15),
    ("Full Color Presentation Printing", "Double-sided 28lb bright white paper with clear cover", "DOCUMENT_PRINTING", 1.25),
    ("Spiral Bound Training Manual", "Up to 50 pages double-sided with vinyl back & frost cover", "DOCUMENT_PRINTING", 14.99),
    ("Premium Matte Business Cards (500)", "16pt cardstock with smooth matte coating", "MARKETING_COLLATERAL", 29.99),
    ("Glossy Tri-Fold Brochures (100)", "100lb glossy text paper, full color full bleed", "MARKETING_COLLATERAL", 49.99),
    ("Event Postcards 4x6 (250)", "14pt glossy cardstock, dual-sided color", "MARKETING_COLLATERAL", 34.99),
    ("Outdoor Vinyl Banner 3x6 ft", "13oz heavy-duty scrim vinyl with metal grommets", "WIDE_FORMAT_SIGNAGE", 79.99),
    ("Foam Board Presentation Poster 24x36", "Full color mount on 3/16 inch white foam core", "WIDE_FORMAT_SIGNAGE", 44.99),
    ("Heavy-Duty Yard Sign 18x24", "Corrugated plastic with wire H-stake included", "WIDE_FORMAT_SIGNAGE", 24.99),
    ("High-Gloss Lamination (Menu Size)", "5 mil thermal pouch sealed edges", "BINDING_FINISHING", 3.50),
    ("Twin Loop Wire Binding (per book)", "Durable metallic wire binding with black comb", "BINDING_FINISHING", 6.00),
    ("Custom Die-Cut Vinyl Stickers (100)", "Waterproof UV-resistant gloss vinyl stickers", "CUSTOM_MERCHANDISE", 39.99),
    ("Custom Branded Notepads (50 sheets, 5pk)", "70lb premium uncoated paper with chipboard back", "CUSTOM_MERCHANDISE", 22.50),
]

ORDER_STATUSES = ["READY FOR PICKUP", "IN PROGRESS", "PENDING", "SHIPPED", "COMPLETED", "CANCELLED"]

PRINT_JOB_NOTES = [
    "High priority rush order for corporate presentation.",
    "Customer requested spiral binding on the long edge with frost cover.",
    "Double check color matching with company brand palette.",
    "Customer will review proof before full production run.",
    "Standard turnaround. Package with protective shrink wrap.",
    "Lamination required on all pages. Trim to border.",
    "Mount on 3/16 inch white foam board with hanging tabs.",
    "Heavy-duty grommets placed every 2 feet along banner hem.",
    "Matte finish cardstock requested with rounded corners.",
    "Standard print job order.",
]


def generate_sql(num_orders: int = NUM_PRINT_ORDERS) -> str:
    order_rows = []
    item_rows = []

    for order_id in range(1, num_orders + 1):
        store_id = random.choice(RETAIL_STORE_IDS)
        order_type = random.choice(["WEB", "WALK_IN"])
        status = random.choice(ORDER_STATUSES)

        # 35% companies, 65% individuals
        if random.random() < 0.35:
            if fake:
                customer_name = fake.company()
                clean_comp = "".join(c for c in customer_name if c.isalnum()).lower()[:12]
                email = f"print@{clean_comp}.ca"
            else:
                customer_name = f"Company Corp {order_id}"
                email = f"orders{order_id}@companycorp.ca"
        else:
            if fake:
                first = fake.first_name()
                last = fake.last_name()
                customer_name = f"{first} {last}"
                clean_first = "".join(c for c in first if c.isalnum()).lower()
                clean_last = "".join(c for c in last if c.isalnum()).lower()
                domain = random.choice(["gmail.com", "outlook.com", "yahoo.ca", "rogers.com", "bell.net"])
                email = f"{clean_first}.{clean_last}{order_id % 1000}@{domain}"
            else:
                customer_name = f"Customer {order_id}"
                email = f"cust{order_id}@example.com"

        phone = random_phone()

        # 1 to 2 items linked to services
        num_items = random.randint(1, 2)
        chosen_service_indices = random.sample(range(len(PRINT_SERVICES)), num_items)

        subtotal = 0.0
        for s_idx in chosen_service_indices:
            service_id = s_idx + 1
            s_name, s_desc, s_cat, s_price = PRINT_SERVICES[s_idx]
            qty = random.choice([1, 1, 2, 4])
            subtotal += s_price * qty
            item_rows.append(f"({order_id}, {service_id}, {escape_sql(s_name)}, {qty}, {s_price:.2f})")

        tax_amount = round(subtotal * 0.13, 2)
        shipping_fee = round(random.choice([9.99, 12.50, 15.00, 19.99]), 2) if (order_type == "WEB" and status == "SHIPPED") else 0.00
        total_amount = round(subtotal + tax_amount + shipping_fee, 2)

        if order_type == "WEB":
            if shipping_fee > 0:
                if fake:
                    shipping_address = f"{fake.street_address()}, {fake.city()}, ON"
                else:
                    shipping_address = f"{order_id * 10} Main St, Toronto, ON"
            else:
                shipping_address = "Store Pickup Counter"
        else:
            shipping_address = None

        days_ago = random.randint(1, 180)
        hours_ago = random.randint(1, 23)
        mins_ago = random.randint(0, 59)
        placed_expr = f"NOW() - INTERVAL '{days_ago} days {hours_ago} hours {mins_ago} minutes'"

        if status in ("COMPLETED", "SHIPPED"):
            fulfill_hours = random.randint(2, 48)
            fulfilled_expr = f"NOW() - INTERVAL '{days_ago} days {hours_ago} hours {mins_ago} minutes' + INTERVAL '{fulfill_hours} hours'"
        else:
            fulfilled_expr = "NULL"

        note = f"{random.choice(PRINT_JOB_NOTES)} (Order #{order_id:04d})"

        order_rows.append(
            f"({store_id}, {escape_sql(customer_name)}, {escape_sql(email)}, {escape_sql(phone)}, "
            f"{escape_sql(order_type)}, {escape_sql(status)}, {subtotal:.2f}, {tax_amount:.2f}, "
            f"{shipping_fee:.2f}, {total_amount:.2f}, {escape_sql(shipping_address)}, "
            f"{escape_sql(note)}, {placed_expr}, {fulfilled_expr})"
        )

    order_columns = "store_id, customer_name, customer_email, customer_phone, order_type, status, subtotal, tax_amount, shipping_fee, total_amount, shipping_address, notes, placed_at, fulfilled_at"
    orders_inserts = build_batched_inserts("print_orders", order_columns, order_rows)

    item_columns = "print_order_id, service_id, description, quantity, unit_price"
    items_inserts = build_batched_inserts("print_order_items", item_columns, item_rows)

    return f"""-- ==============================================================================
-- 13_print_orders_seed.sql
-- Customer print orders and order items
-- ==============================================================================

TRUNCATE TABLE 
    print_order_items,
    print_orders
RESTART IDENTITY CASCADE;

-- 1. Print Orders
{orders_inserts}

-- 2. Print Order Items
{items_inserts}
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("13_print_orders_seed.sql", sql)
        print(f"Generated {out_path.name} ({NUM_PRINT_ORDERS} print orders)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
