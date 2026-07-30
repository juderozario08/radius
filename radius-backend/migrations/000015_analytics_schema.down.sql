DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;

ALTER TABLE inventory
    DROP COLUMN IF EXISTS in_transit_qty,
    DROP COLUMN IF EXISTS sellable_qty,
    DROP COLUMN IF EXISTS non_sellable_qty,
    DROP COLUMN IF EXISTS demo_qty,
    DROP COLUMN IF EXISTS open_box_qty,
    DROP COLUMN IF EXISTS damaged_qty,
    DROP COLUMN IF EXISTS returned_qty;

ALTER TABLE stores
    DROP COLUMN IF EXISTS location_type,
    DROP COLUMN IF EXISTS region,
    DROP COLUMN IF EXISTS open_date,
    DROP COLUMN IF EXISTS close_date,
    DROP COLUMN IF EXISTS manager_id;

ALTER TABLE products
    DROP COLUMN IF EXISTS default_cost,
    DROP COLUMN IF EXISTS default_price,
    DROP COLUMN IF EXISTS tax_class,
    DROP COLUMN IF EXISTS is_returnable,
    DROP COLUMN IF EXISTS warranty_days,
    DROP COLUMN IF EXISTS images,
    DROP COLUMN IF EXISTS color,
    DROP COLUMN IF EXISTS size,
    DROP COLUMN IF EXISTS lifecycle_stage;

DROP TYPE IF EXISTS tax_class;
DROP TYPE IF EXISTS inventory_transaction_type;
DROP TYPE IF EXISTS location_type;
