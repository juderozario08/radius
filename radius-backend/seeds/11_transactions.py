#!/usr/bin/env python3
"""
Generator for 11_transactions_seed.sql
Generates POS retail transactions and transaction line items.
"""

import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (
    NUM_TRANSACTIONS,
    NUM_PRODUCTS,
    RETAIL_STORE_IDS,
    DEFAULT_EMPLOYEE_IDS,
    escape_sql,
    write_sql_file,
    build_batched_inserts,
)

REGISTERS = ["REG1", "REG2", "REG3", "REG4"]
PAYMENT_METHODS = ["CARD", "CASH", "GIFT CARD"]
PAYMENT_WEIGHTS = [60, 30, 10]
CARD_TYPES = ["Visa", "Mastercard", "Amex", "Debit"]


def generate_sql(num_transactions: int = NUM_TRANSACTIONS) -> str:
    tx_rows = []
    item_rows = []

    for tx_id in range(1, num_transactions + 1):
        store_id = random.choice(RETAIL_STORE_IDS)
        reg_id = random.choice(REGISTERS)
        emp_id = random.choice(DEFAULT_EMPLOYEE_IDS)
        pay_method = random.choices(PAYMENT_METHODS, weights=PAYMENT_WEIGHTS)[0]

        if pay_method == "CARD":
            card_type = random.choice(CARD_TYPES)
            card_last4 = f"{random.randint(1000, 9999)}"
        else:
            card_type = None
            card_last4 = None

        # 1 to 3 items per transaction
        num_items = random.randint(1, 3)
        chosen_prods = random.sample(range(1, NUM_PRODUCTS + 1), num_items)

        tx_subtotal = 0.0
        for prod_id in chosen_prods:
            qty = random.choice([1, 1, 1, 2, 3])
            price = round(random.uniform(9.99, 49.99), 2)
            cost = round(price * random.uniform(0.4, 0.6), 2)
            tx_subtotal += price * qty
            item_rows.append(f"({tx_id}, {prod_id}, {qty}, {price:.2f}, {cost:.2f})")

        # Tax: 13% for ON stores (2,3), 12% for others
        tax_rate = 0.13 if store_id in (2, 3) else 0.12
        tax_amount = round(tx_subtotal * tax_rate, 2)
        total_amount = round(tx_subtotal + tax_amount, 2)

        tx_rows.append(
            f"({store_id}, {escape_sql(reg_id)}, {emp_id}, {tx_subtotal:.2f}, "
            f"{tax_amount:.2f}, {total_amount:.2f}, 'SALE', {escape_sql(pay_method)}, "
            f"'COMPLETED', {escape_sql(card_type)}, {escape_sql(card_last4)})"
        )

    tx_columns = "store_id, register_id, employee_id, subtotal, tax_amount, total_amount, transaction_type, payment_method, status, card_type, card_number"
    tx_inserts = build_batched_inserts("transactions", tx_columns, tx_rows)

    item_columns = "transaction_id, product_id, quantity, unit_price, unit_cost"
    item_inserts = build_batched_inserts("transaction_items", item_columns, item_rows)

    return f"""-- ==============================================================================
-- 11_transactions_seed.sql
-- In-store POS register transactions and purchased items
-- ==============================================================================

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_employee_id_fkey;

TRUNCATE TABLE transaction_items, transactions RESTART IDENTITY CASCADE;

{tx_inserts}

{item_inserts}

ALTER TABLE transactions ADD CONSTRAINT transactions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(employee_id) NOT VALID;
"""


def main(output_file: bool = True):
    sql = generate_sql()
    if output_file:
        out_path = write_sql_file("11_transactions_seed.sql", sql)
        print(f"Generated {out_path.name} ({NUM_TRANSACTIONS} transactions)")
    else:
        print(sql)


if __name__ == "__main__":
    main()
