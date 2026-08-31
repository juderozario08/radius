#!/usr/bin/env python3
"""
Generator for 06_product_suppliers_seed.sql
Maps products to primary and secondary suppliers with wholesale cost pricing.
"""

import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_PRODUCTS,
    NUM_SUPPLIERS,
    escape_sql,
    write_sql_file,
)


def generate_sql(num_products: int = NUM_PRODUCTS, num_suppliers: int = NUM_SUPPLIERS) -> str:
    rows = []
    
    for i in range(num_products):
        product_id = i + 1
        sku_num = 10000 + i
        
        # Primary supplier
        primary_supplier_id = (i % num_suppliers) + 1
        supplier_sku = f"SUP-SKU-{sku_num}"
        # Cost price roughly $8 to $60
        cost_price = round(10.0 + (i % 45) * 0.85 + random.uniform(0.5, 3.5), 2)
        
        rows.append(f"({product_id}, {primary_supplier_id}, {escape_sql(supplier_sku)}, {cost_price:.2f}, true)")

        # Secondary supplier for ~40% of products
        if i % 5 in (1, 3):
            sec_supplier_id = ((primary_supplier_id + 2) % num_suppliers) + 1
            sec_sku = f"ALT-SKU-{sku_num}"
            sec_cost = round(cost_price * random.uniform(1.02, 1.15), 2)
            rows.append(f"({product_id}, {sec_supplier_id}, {escape_sql(sec_sku)}, {sec_cost:.2f}, false)")

    values_str = ",\n".join(rows)
    return f"""-- ==============================================================================
-- 06_product_suppliers_seed.sql
-- Mapping between products and wholesale suppliers (Primary & Secondary vendors)
-- ==============================================================================

INSERT INTO product_suppliers (product_id, supplier_id, supplier_sku, cost_price, is_primary) VALUES
{values_str};
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("06_product_suppliers_seed.sql", sql)
        print(f"Generated {out_path.name} (product-supplier links for {NUM_PRODUCTS} products)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
