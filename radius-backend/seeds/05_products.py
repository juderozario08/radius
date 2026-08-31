#!/usr/bin/env python3
"""
Generator for 05_products_seed.sql
Generates product master records mapped across categories.
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
)


def generate_sql(num_products: int = NUM_PRODUCTS) -> str:
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
            base_name, base_desc, brand, weight, price = cat_pool[item_idx]
            # If cycling over products, add slight modifier to ensure variety
            cycle = i // (NUM_CATEGORIES * len(cat_pool))
            if cycle > 0:
                name = f"{base_name} (Gen {cycle + 1})"
                description = f"{base_desc} - Edition {cycle + 1}"
            else:
                name = base_name
                description = base_desc
        else:
            name = f"Retail Product {product_idx}"
            description = f"Standard retail catalog item {product_idx}"
            brand = f"Brand {(i % 5) + 1}"
            weight = round(random.uniform(0.5, 5.0), 2)
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

    values_str = ",\n".join(rows)
    return f"""-- ==============================================================================
-- 05_products_seed.sql
-- Product catalog items
-- ==============================================================================

INSERT INTO products (sku, upc, name, description, category_id, brand, weight, is_active, retail_price, constrained_end_after) VALUES
{values_str};
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
