ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_card_last4 VARCHAR(4);
UPDATE transactions SET payment_card_last4 = card_number WHERE card_number IS NOT NULL AND payment_card_last4 IS NULL;
ALTER TABLE transactions DROP COLUMN IF EXISTS card_number;
