DROP TABLE IF EXISTS purchase_order_lpr_items;
DROP TABLE IF EXISTS purchase_order_lprs;
ALTER TABLE stock_transfers DROP COLUMN IF EXISTS manual_check_required;
