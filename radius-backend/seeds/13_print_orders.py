#!/usr/bin/env python3
"""
Generator for 13_print_orders_seed.sql
Generates Print Services catalog, shop supplies, customer print orders, and line items.
"""

import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_PRINT_ORDERS,
    DEFAULT_STORE_IDS,
    FIRST_NAMES,
    LAST_NAMES,
    COMPANY_NAMES,
    random_email,
    random_phone,
    escape_sql,
    write_sql_file,
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

PRINT_SUPPLIES_CATALOG = [
    ("20lb White Bond Paper (Letter Ream)", "500 sheets standard copy paper", "REAM", 45, 15, 50, 4.50, "Domtar Paper Supply"),
    ("28lb Bright White Laser Paper", "500 sheets heavy presentation paper", "REAM", 15, 10, 30, 8.20, "Hammermill Commercial"),
    ("16pt Matte Cardstock (12x18 Sheets)", "250 sheets premium cardstock", "PACK", 10, 10, 25, 18.50, "Mohawk Fine Papers"),
    ("13oz Scrim Vinyl Banner Roll 36\"x100ft", "Matte white wide format roll", "ROLL", 3, 2, 5, 65.00, "Grimco Graphic Supplies"),
    ("Black Toner Cartridge (DocuColor 550)", "High-yield black toner 30k pages", "CARTRIDGE", 3, 2, 4, 120.00, "Xerox Canada"),
    ("Cyan Toner Cartridge (DocuColor 550)", "High-yield cyan toner 34k pages", "CARTRIDGE", 2, 2, 4, 145.00, "Xerox Canada"),
    ("Thermal Lamination Pouches (Letter 5mil)", "Box of 100 laminating pouches", "BOX", 12, 5, 20, 12.00, "GBC Binding Systems"),
    ("Black Spiral Binding Coils (12mm)", "Box of 100 coils 4:1 pitch", "BOX", 8, 4, 10, 15.00, "Akiles Binding Products"),
]

ORDER_STATUSES = ["READY FOR PICKUP", "IN PROGRESS", "PENDING", "SHIPPED", "COMPLETED", "CANCELLED"]


def generate_sql(num_orders: int = NUM_PRINT_ORDERS) -> str:
    # 1. Print Services
    service_rows = []
    for name, desc, cat, price in PRINT_SERVICES:
        service_rows.append(f"({escape_sql(name)}, {escape_sql(desc)}, {escape_sql(cat)}, {price:.2f}, true)")
    services_sql = ",\n".join(service_rows)

    # 2. Print Supplies
    supply_rows = []
    for store_id in DEFAULT_STORE_IDS:
        for name, desc, unit, qty, thresh, reorder, cost, supp in PRINT_SUPPLIES_CATALOG:
            var_qty = max(1, qty + random.randint(-5, 10))
            supply_rows.append(
                f"({store_id}, {escape_sql(name)}, {escape_sql(desc)}, {escape_sql(unit)}, "
                f"{var_qty}, {thresh}, {reorder}, {cost:.2f}, {escape_sql(supp)}, true)"
            )
    supplies_sql = ",\n".join(supply_rows)

    # 3. Print Orders & Items
    order_rows = []
    item_rows = []

    for order_id in range(1, num_orders + 1):
        store_id = DEFAULT_STORE_IDS[(order_id - 1) % len(DEFAULT_STORE_IDS)]
        order_type = "WEB" if order_id % 2 == 1 else "WALK_IN"
        status = ORDER_STATUSES[(order_id - 1) % len(ORDER_STATUSES)]
        
        if random.random() < 0.35:
            customer_name = random.choice(COMPANY_NAMES)
            first, last = "Admin", "Orders"
        else:
            first = FIRST_NAMES[(order_id * 3) % len(FIRST_NAMES)]
            last = LAST_NAMES[(order_id * 7) % len(LAST_NAMES)]
            customer_name = f"{first} {last}"
            
        email = random_email(first, last)
        phone = random_phone()
        
        # 1 to 2 items
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
        shipping_fee = 12.50 if (order_type == "WEB" and status == "SHIPPED") else 0.00
        total_amount = round(subtotal + tax_amount + shipping_fee, 2)

        if order_type == "WEB":
            ship_addr = "Store Pickup Counter" if shipping_fee == 0 else "450 University Ave, Toronto, ON"
        else:
            ship_addr = "NULL"

        placed_expr = f"NOW() - INTERVAL '{order_id * 2} hours'"
        if status == "COMPLETED":
            fulfilled_expr = f"NOW() - INTERVAL '{order_id * 2 - 1} hours'"
        elif status == "SHIPPED":
            fulfilled_expr = f"NOW() - INTERVAL '{order_id * 2 - 2} hours'"
        else:
            fulfilled_expr = "NULL"

        note = f"Customer job note for order #{order_id:04d}"

        order_rows.append(
            f"({store_id}, {escape_sql(customer_name)}, {escape_sql(email)}, {escape_sql(phone)}, "
            f"{escape_sql(order_type)}, {escape_sql(status)}, {subtotal:.2f}, {tax_amount:.2f}, "
            f"{shipping_fee:.2f}, {total_amount:.2f}, "
            f"{escape_sql(ship_addr) if ship_addr != 'NULL' else 'NULL'}, "
            f"{escape_sql(note)}, {placed_expr}, {fulfilled_expr})"
        )

    orders_sql = ",\n".join(order_rows)
    items_sql = ",\n".join(item_rows)

    return f"""-- ==============================================================================
-- 13_print_orders_seed.sql
-- Print Services catalog, shop supplies inventory, print orders and order items
-- ==============================================================================

TRUNCATE TABLE 
    print_order_items,
    print_orders,
    print_supplies,
    print_services
RESTART IDENTITY CASCADE;

-- 1. Print Services Catalog
INSERT INTO print_services (name, description, category, base_price, is_active) VALUES
{services_sql};

-- 2. Print Supplies Inventory
INSERT INTO print_supplies (store_id, name, description, unit, current_qty, reorder_threshold, reorder_qty, unit_cost, supplier_name, is_active) VALUES
{supplies_sql};

-- 3. Print Orders
INSERT INTO print_orders (store_id, customer_name, customer_email, customer_phone, order_type, status, subtotal, tax_amount, shipping_fee, total_amount, shipping_address, notes, placed_at, fulfilled_at) VALUES
{orders_sql};

-- 4. Print Order Items
INSERT INTO print_order_items (print_order_id, service_id, description, quantity, unit_price) VALUES
{items_sql};
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("13_print_orders_seed.sql", sql)
        print(f"Generated {out_path.name} ({len(PRINT_SERVICES)} services, {NUM_PRINT_ORDERS} print orders)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
