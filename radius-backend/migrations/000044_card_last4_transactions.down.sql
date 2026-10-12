ALTER TABLE transactions ADD COLUMN IF NOT EXISTS card_number VARCHAR(4);
UPDATE transactions SET card_number = payment_card_last4 WHERE payment_card_last4 IS NOT NULL AND card_number IS NULL;
ALTER TABLE transactions DROP COLUMN IF EXISTS payment_card_last4;
