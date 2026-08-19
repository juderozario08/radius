// radius-backend/internal/repository/inventory_repo.go
package repository

import (
	"context"
	"database/sql"
	"fmt"
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
			i.aisle, NULL AS mims_location, i.last_counted_at
		FROM products p
		LEFT JOIN inventory i ON p.product_id = i.product_id AND i.store_id = $1
		WHERE (LENGTH($2) >= 14 AND p.upc = $2) OR (LENGTH($2) BETWEEN 5 AND 10 AND p.sku = $2)
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
			i.aisle, NULL AS mims_location, i.last_counted_at
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
	query := `UPDATE inventory SET new_qty = new_qty + $1 WHERE product_id = $2 AND store_id = $3`
	_, err := r.db.ExecContext(ctx, query, delta, productID, storeID)
	return err
}

func (r *InventoryRepo) UpdateInventoryQuantity(ctx context.Context, storeID int, productID int, quantity int) error {
	query := `UPDATE inventory SET new_qty = $1 WHERE product_id = $2 AND store_id = $3`
	_, err := r.db.ExecContext(ctx, query, quantity, productID, storeID)
	return err
}

func (r *InventoryRepo) GetProductScreenDetails(ctx context.Context, storeID int, productID int) (*models.ProductScreenDetails, error) {
	var details models.ProductScreenDetails

	// 1. Get Product
	productQuery := `SELECT product_id, sku, upc, name, description, category_id, brand, unit_of_measure, units_per_case, weight, is_active, retail_price, constrained_end_after, created_at FROM products WHERE product_id = $1`
	err := r.db.QueryRowContext(ctx, productQuery, productID).Scan(
		&details.Product.ProductId, &details.Product.Sku, &details.Product.Upc, &details.Product.Name,
		&details.Product.Description, &details.Product.CategoryId, &details.Product.Brand,
		&details.Product.UnitOfMeasure, &details.Product.UnitsPerCase, &details.Product.Weight,
		&details.Product.IsActive, &details.Product.RetailPrice, &details.Product.ConstrainedEndAfter,
		&details.Product.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Product not found
		}
		return nil, err
	}

	// 2. Get Inventory
	inventoryQuery := `
		SELECT inventory_id, store_id, product_id, on_hand_qty, reserved_qty, reorder_qty, aisle, 
		       NULL AS mims_location, last_counted_at, updated_at, available_qty, open_box_qty, new_qty, 
		       rtv_qty, code88_qty, bopis_qty, quarantine_qty, repair_qty, customer_on_hold_qty, 
		       fc_on_hold_qty, verify_qty, demo_qty, on_order_qty, last_received_at
		FROM inventory WHERE product_id = $1 AND store_id = $2`
	err = r.db.QueryRowContext(ctx, inventoryQuery, productID, storeID).Scan(
		&details.Inventory.InventoryId, &details.Inventory.StoreId, &details.Inventory.ProductId,
		&details.Inventory.OnHandQty, &details.Inventory.ReservedQty, &details.Inventory.ReorderQty,
		&details.Inventory.Aisle, &details.Inventory.MimsLocation, &details.Inventory.LastCountedAt,
		&details.Inventory.UpdatedAt, &details.Inventory.AvailableQty, &details.Inventory.OpenBoxQty,
		&details.Inventory.NewQty, &details.Inventory.RtvQty, &details.Inventory.Code88Qty,
		&details.Inventory.BopisQty, &details.Inventory.QuarantineQty, &details.Inventory.RepairQty,
		&details.Inventory.CustomerOnHoldQty, &details.Inventory.FcOnHoldQty, &details.Inventory.VerifyQty,
		&details.Inventory.DemoQty, &details.Inventory.OnOrderQty, &details.Inventory.LastReceivedAt,
	)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	// 3. Get Locations
	if details.Inventory.InventoryId != 0 {
		locationsQuery := `SELECT mims_location_id, store_id, inventory_id, quantity, location_type FROM mims_location_items WHERE inventory_id = $1 AND store_id = $2`
		rows, err := r.db.QueryContext(ctx, locationsQuery, details.Inventory.InventoryId, storeID)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		for rows.Next() {
			var loc models.MimsLocationItem
			if err := rows.Scan(&loc.MimsLocationId, &loc.StoreId, &loc.InventoryId, &loc.Quantity, &loc.LocationType); err != nil {
				return nil, err
			}
			details.Locations = append(details.Locations, loc)
		}
		if err := rows.Err(); err != nil {
			return nil, err
		}
	} else {
		details.Locations = []models.MimsLocationItem{}
	}

	// 4. Get Planogram (Active one for the product at the store)
	planogramQuery := `
		SELECT p.planogram_id, p.store_id, p.name, p.description, p.aisle, p.valid_from, p.is_active, p.created_by, p.created_at, p.updated_at
		FROM planograms p
		JOIN planogram_products pp ON p.planogram_id = pp.planogram_id
		WHERE pp.product_id = $1 AND p.store_id = $2 AND p.is_active = true
		LIMIT 1`
	var p models.Planogram
	err = r.db.QueryRowContext(ctx, planogramQuery, productID, storeID).Scan(
		&p.PlanogramId, &p.StoreId, &p.Name, &p.Description, &p.Aisle, &p.ValidFrom,
		&p.IsActive, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if err == nil {
		details.PlanogramInfo = &p
	} else if err != sql.ErrNoRows {
		return nil, err
	}

	return &details, nil
}

func (r *InventoryRepo) SyncLocations(ctx context.Context, storeID int, inventoryID int, locations []models.MimsLocationItem) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Delete all existing locations for this inventory
	_, err = tx.ExecContext(ctx, "DELETE FROM mims_location_items WHERE store_id = $1 AND inventory_id = $2", storeID, inventoryID)
	if err != nil {
		return err
	}

	// 2. Insert new locations (only if quantity > 0)
	insertQuery := `
		INSERT INTO mims_location_items (mims_location_id, store_id, inventory_id, quantity, location_type)
		VALUES ($1, $2, $3, $4, $5)
	`
	for _, loc := range locations {
		if loc.Quantity > 0 {
			_, err = tx.ExecContext(ctx, insertQuery, loc.MimsLocationId, storeID, inventoryID, loc.Quantity, loc.LocationType)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (r *InventoryRepo) CreateMimsLocation(ctx context.Context, storeID int, locationID string) error {
	query := `INSERT INTO mims_location (mims_location_id, store_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`
	_, err := r.db.ExecContext(ctx, query, locationID, storeID)
	return err
}

func (r *InventoryRepo) CreateInventoryAdjustment(ctx context.Context, adj models.InventoryAdjustment) error {
	query := `
		INSERT INTO inventory_adjustments (store_id, inventory_id, product_id, previous_qty, adjusted_qty, reason, requested_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.ExecContext(ctx, query, adj.StoreId, adj.InventoryId, adj.ProductId, adj.PreviousQty, adj.AdjustedQty, adj.Reason, adj.RequestedBy)
	return err
}

func (r *InventoryRepo) GetPendingAdjustments(ctx context.Context, storeID int) ([]models.PendingAdjustmentDetail, error) {
	query := `
		SELECT
			a.adjustment_id, a.inventory_id, a.product_id, a.previous_qty, a.adjusted_qty, a.reason, a.created_at,
			e.first_name || ' ' || e.last_name AS requested_by,
			p.name, p.sku, p.upc
		FROM inventory_adjustments a
		JOIN employees e ON a.requested_by = e.employee_id
		JOIN products p ON a.product_id = p.product_id
		WHERE a.store_id = $1 AND a.status = 'PENDING'
		ORDER BY a.created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := []models.PendingAdjustmentDetail{}
	for rows.Next() {
		var d models.PendingAdjustmentDetail
		if err := rows.Scan(
			&d.AdjustmentId, &d.InventoryId, &d.ProductId, &d.PreviousQty, &d.AdjustedQty, &d.Reason, &d.CreatedAt,
			&d.RequestedBy, &d.Name, &d.Sku, &d.Upc,
		); err != nil {
			return nil, err
		}
		results = append(results, d)
	}
	return results, rows.Err()
}

func (r *InventoryRepo) ReviewAdjustments(ctx context.Context, storeID int, reviewerID int, reviews []models.ReviewAdjustmentItem) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	updateAdjQuery := `
		UPDATE inventory_adjustments
		SET status = $1, reviewed_by = $2, reviewed_at = NOW(), adjusted_qty = COALESCE($3, adjusted_qty), reason = COALESCE($4, reason)
		WHERE adjustment_id = $5 AND store_id = $6 AND status = 'PENDING'
		RETURNING inventory_id, product_id, COALESCE($3, adjusted_qty), previous_qty, COALESCE($4, reason)
	`

	updateInvQuery := `
		UPDATE inventory
		SET new_qty = $1
		WHERE inventory_id = $2
	`

	auditQuery := `
		INSERT INTO inventory_transactions
			(product_id, to_store_id, transaction_type, quantity, reason_code, employee_id, reference_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	deleteAdjQuery := `DELETE FROM inventory_adjustments WHERE adjustment_id = $1`

	for _, rev := range reviews {
		var invId, productId, finalQty, previousQty int
		var reason string

		err := tx.QueryRowContext(ctx, updateAdjQuery, rev.Status, reviewerID, rev.AdjustedQty, rev.Reason, rev.AdjustmentId, storeID).Scan(&invId, &productId, &finalQty, &previousQty, &reason)
		if err != nil {
			if err == sql.ErrNoRows {
				return fmt.Errorf("adjustment %d not found or already reviewed", rev.AdjustmentId)
			}
			return err
		}

		if rev.Status == models.AdjustmentStatusApproved || rev.Status == models.AdjustmentStatusWriteOff {
			_, err = tx.ExecContext(ctx, updateInvQuery, finalQty, invId)
			if err != nil {
				return err
			}
		}

		// Log to audit trail
		txnType := "ADJUSTMENT"
		if rev.Status == models.AdjustmentStatusWriteOff {
			txnType = "WRITE_OFF"
		}
		qtyDelta := finalQty - previousQty
		if rev.Status == models.AdjustmentStatusRejected {
			qtyDelta = 0 // Rejected means no actual quantity change
		}
		refId := fmt.Sprintf("ADJUSTMENT:%d", rev.AdjustmentId)
		_, err = tx.ExecContext(ctx, auditQuery, productId, storeID, txnType, qtyDelta, reason, reviewerID, refId)
		if err != nil {
			return err
		}

		// Delete the resolved adjustment
		_, err = tx.ExecContext(ctx, deleteAdjQuery, rev.AdjustmentId)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
