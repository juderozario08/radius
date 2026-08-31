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
    DEFAULT_STORE_IDS,
    DEFAULT_EMPLOYEE_IDS,
    escape_sql,
    write_sql_file,
)

REGISTERS = ["REG1", "REG2", "REG3", "REG4"]
PAYMENT_METHODS = ["CARD", "CARD", "CARD", "CASH", "GIFT CARD"]
CARD_TYPES = ["Visa", "Mastercard", "Amex", "Debit"]


def generate_sql(num_transactions: int = NUM_TRANSACTIONS) -> str:
    tx_rows = []
    item_rows = []

    for tx_id in range(1, num_transactions + 1):
        store_id = DEFAULT_STORE_IDS[(tx_id - 1) % len(DEFAULT_STORE_IDS)]
        reg_id = REGISTERS[(tx_id - 1) % len(REGISTERS)]
        emp_id = DEFAULT_EMPLOYEE_IDS[(tx_id - 1) % len(DEFAULT_EMPLOYEE_IDS)]
        pay_method = PAYMENT_METHODS[(tx_id - 1) % len(PAYMENT_METHODS)]
        
        card_type = random.choice(CARD_TYPES) if pay_method == "CARD" else None
        card_last4 = f"{random.randint(1000, 9999)}" if pay_method == "CARD" else None

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

        tax_rate = 0.13 if store_id == 1 else 0.12  # ON vs BC
        tax_amount = round(tx_subtotal * tax_rate, 2)
        total_amount = round(tx_subtotal + tax_amount, 2)

        tx_rows.append(
            f"({store_id}, {escape_sql(reg_id)}, {emp_id}, {tx_subtotal:.2f}, "
            f"{tax_amount:.2f}, {total_amount:.2f}, 'SALE', {escape_sql(pay_method)}, "
            f"'COMPLETED', {escape_sql(card_type)}, {escape_sql(card_last4)})"
        )

    tx_values_str = ",\n".join(tx_rows)
    items_values_str = ",\n".join(item_rows)

    return f"""-- ==============================================================================
-- 11_transactions_seed.sql
-- In-store POS register transactions and purchased items
-- ==============================================================================

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_employee_id_fkey;

TRUNCATE TABLE transaction_items, transactions RESTART IDENTITY CASCADE;

INSERT INTO transactions (store_id, register_id, employee_id, subtotal, tax_amount, total_amount, transaction_type, payment_method, status, card_type, card_number) VALUES
{tx_values_str};

INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, unit_cost) VALUES
{items_values_str};

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
