// radius-backend/internal/repository/inventory_repo.go
package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
)

type InventoryRepo struct {
	db *sql.DB
}

func NewInventoryRepo(db *sql.DB) *InventoryRepo {
	return &InventoryRepo{db: db}
}

func (r *InventoryRepo) GetInventoryByBarcode(ctx context.Context, storeID int, barcode string) (*models.MimsProductInventory, error) {
	query := `
		SELECT p.product_id, p.sku, p.upc, p.name, p.brand, p.description,
			p.unit_of_measure, p.units_per_case, p.weight, p.is_active,
			COALESCE(i.on_hand_qty, 0), COALESCE(i.reserved_qty, 0),
			COALESCE(i.available_qty, 0), COALESCE(i.reorder_qty, 0),
			i.aisle, i.mims_location_id, i.last_counted_at
		FROM products p
		LEFT JOIN inventory i ON p.product_id = i.product_id AND i.store_id = $1
		WHERE p.upc = $2 OR p.sku = $2
		LIMIT 1
	`
	var item models.MimsProductInventory
	err := r.db.QueryRowContext(ctx, query, storeID, barcode).Scan(
		&item.ProductId, &item.Sku, &item.Upc, &item.Name, &item.Brand, &item.Description,
		&item.UnitOfMeasure, &item.UnitsPerCase, &item.Weight, &item.IsActive,
		&item.OnHandQty, &item.ReservedQty, &item.AvailableQty, &item.ReorderQty,
		&item.Aisle, &item.MimsLocation, &item.LastCountedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *InventoryRepo) GetProductsByLocation(ctx context.Context, storeID int, locationID string) ([]models.MimsProductInventory, error) {
	query := `
		SELECT p.product_id, p.sku, p.upc, p.name, p.brand, p.description,
			p.unit_of_measure, p.units_per_case, p.weight, p.is_active,
			COALESCE(i.on_hand_qty, 0), COALESCE(i.reserved_qty, 0),
			COALESCE(i.available_qty, 0), COALESCE(i.reorder_qty, 0),
			i.aisle, i.mims_location_id, i.last_counted_at
		FROM mims_location_items mli
		JOIN inventory i ON mli.inventory_id = i.inventory_id AND mli.store_id = i.store_id
		JOIN products p ON i.product_id = p.product_id
		WHERE mli.mims_location_id = $1 AND mli.store_id = $2
		ORDER BY p.name ASC
	`
	rows, err := r.db.QueryContext(ctx, query, locationID, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.MimsProductInventory
	for rows.Next() {
		var item models.MimsProductInventory
		if err := rows.Scan(
			&item.ProductId, &item.Sku, &item.Upc, &item.Name, &item.Brand, &item.Description,
			&item.UnitOfMeasure, &item.UnitsPerCase, &item.Weight, &item.IsActive,
			&item.OnHandQty, &item.ReservedQty, &item.AvailableQty, &item.ReorderQty,
			&item.Aisle, &item.MimsLocation, &item.LastCountedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if items == nil {
		items = []models.MimsProductInventory{}
	}
	return items, nil
}

func (r *InventoryRepo) LogScan(ctx context.Context, log models.MimsScanLog) error {
	query := `
		INSERT INTO mims_scan_log (store_id, employee_id, product_id, scanned_barcode, mims_location_id, scan_type)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.ExecContext(ctx, query, log.StoreId, log.EmployeeId, log.ProductId, log.ScannedBarcode, log.MimsLocationId, log.ScanType)
	return err
}

func (r *InventoryRepo) CheckLocationExists(ctx context.Context, storeID int, locationID string) (bool, error) {
	query := `SELECT 1 FROM mims_location WHERE mims_location_id = $1 AND store_id = $2`
	var exists int
	err := r.db.QueryRowContext(ctx, query, locationID, storeID).Scan(&exists)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (r *InventoryRepo) CheckProductInLocation(ctx context.Context, storeID int, locationID string, productID int) (bool, error) {
	query := `
		SELECT 1 FROM mims_location_items mli
		JOIN inventory i ON mli.inventory_id = i.inventory_id
		WHERE mli.mims_location_id = $1 AND mli.store_id = $2 AND i.product_id = $3
	`
	var exists int
	err := r.db.QueryRowContext(ctx, query, locationID, storeID, productID).Scan(&exists)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (r *InventoryRepo) LinkProductToLocation(ctx context.Context, storeID int, locationID string, productID int) error {
	query := `
		INSERT INTO mims_location_items (mims_location_id, store_id, inventory_id)
		SELECT $1, $2, i.inventory_id
		FROM inventory i
		WHERE i.product_id = $3 AND i.store_id = $2
		ON CONFLICT (mims_location_id, store_id, inventory_id) DO NOTHING
	`
	_, err := r.db.ExecContext(ctx, query, locationID, storeID, productID)
	return err
}

func (r *InventoryRepo) IncrementInventoryQuantity(ctx context.Context, storeID int, productID int, delta int) error {
	query := `UPDATE inventory SET on_hand_qty = on_hand_qty + $1 WHERE product_id = $2 AND store_id = $3`
	_, err := r.db.ExecContext(ctx, query, delta, productID, storeID)
	return err
}

func (r *InventoryRepo) UpdateInventoryQuantity(ctx context.Context, storeID int, productID int, quantity int) error {
	query := `UPDATE inventory SET on_hand_qty = $1 WHERE product_id = $2 AND store_id = $3`
	_, err := r.db.ExecContext(ctx, query, quantity, productID, storeID)
	return err
}
