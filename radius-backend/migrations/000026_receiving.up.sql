-- Add manual_check_required to stock_transfers
ALTER TABLE stock_transfers ADD COLUMN manual_check_required BOOLEAN DEFAULT FALSE;

-- LPR table: each LPR is a box on a PO shipment
CREATE TABLE purchase_order_lprs (
    lpr_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    po_id INT REFERENCES purchase_orders (po_id) NOT NULL,
    lpr_barcode VARCHAR(20) UNIQUE NOT NULL,
    is_received BOOLEAN DEFAULT FALSE,
    received_by INT REFERENCES employees (employee_id),
    received_at TIMESTAMPTZ
);

-- LPR items: which PO items (and how many) are in each LPR box
CREATE TABLE purchase_order_lpr_items (
    lpr_item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lpr_id INT REFERENCES purchase_order_lprs (lpr_id) NOT NULL,
    po_item_id INT REFERENCES purchase_orders_items (po_item_id) NOT NULL,
    qty INT NOT NULL
);
