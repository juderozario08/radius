#!/usr/bin/env python3
"""
Generator for 05_products_seed.sql
Generates master product catalog records mapped across categories.
"""

import sys
import random
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_PRODUCTS,
    NUM_CATEGORIES,
    CATEGORY_PRODUCTS,
    escape_sql,
    write_sql_file,
    build_batched_inserts,
    fake,
)


def generate_sql(num_products: int = NUM_PRODUCTS) -> str:
    columns = "sku, upc, name, description, category_id, brand, weight, is_active, retail_price, constrained_end_after"
    rows = []
    
    for i in range(num_products):
        product_idx = i + 1
        sku = str(10000 + i)
        upc = f"001000{product_idx:08d}"
        
        # Determine category (1-indexed, distributed across available categories)
        cat_id = (i % NUM_CATEGORIES) + 1
        
        # Get product pool for this category
        cat_pool = CATEGORY_PRODUCTS.get(cat_id, [])
        item_idx = (i // NUM_CATEGORIES) % len(cat_pool) if cat_pool else 0
        
        if cat_pool:
            base_name, base_desc, base_brand, base_weight, base_price = cat_pool[item_idx]
            # If cycling over products, add slight modifier to ensure variety
            cycle = i // (NUM_CATEGORIES * len(cat_pool))
            if cycle == 0:
                name = base_name
                description = base_desc
                brand = base_brand
            elif cycle <= 5:
                name = f"{base_name} (Gen {cycle + 1})"
                description = f"{base_desc} - Edition {cycle + 1}"
                brand = base_brand
            else:
                name = f"{base_name} (Gen {cycle + 1})"
                brand = fake.company()[:100] if fake else base_brand
                description = f"{base_desc} - {fake.catch_phrase()}" if fake else f"{base_desc} - Edition {cycle + 1}"
            weight = base_weight
            price = base_price
        else:
            name = f"Retail Product {product_idx}"
            description = f"Standard retail catalog item {product_idx}"
            brand = fake.company()[:100] if fake else f"Brand {(i % 5) + 1}"
            weight = round(random.uniform(0.5, 5.0), 3)
            price = round(random.uniform(9.99, 149.99), 2)

        is_active = True
        # Constrained end date around 6-12 months out
        constrained_date = (date.today() + timedelta(days=random.randint(180, 365))).isoformat()

        row_str = (
            f"({escape_sql(sku)}, {escape_sql(upc)}, {escape_sql(name)}, "
            f"{escape_sql(description)}, {cat_id}, {escape_sql(brand)}, "
            f"{weight}, {escape_sql(is_active)}, {price:.2f}, {escape_sql(constrained_date)})"
        )
        rows.append(row_str)

    batched_inserts = build_batched_inserts("products", columns, rows)

    return f"""-- ==============================================================================
-- 05_products_seed.sql
-- Master Products Catalog
-- ==============================================================================

TRUNCATE TABLE products RESTART IDENTITY CASCADE;

{batched_inserts}
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("05_products_seed.sql", sql)
        print(f"Generated {out_path.name} ({NUM_PRODUCTS} products)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
