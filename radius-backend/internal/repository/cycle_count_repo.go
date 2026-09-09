// radius-backend/internal/repository/cycle_count_repo.go
package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"radius/internal/models"
	"strings"
	"time"
)

type CycleCountRepo struct {
	db *sql.DB
}

func NewCycleCountRepo(db *sql.DB) *CycleCountRepo {
	return &CycleCountRepo{db: db}
}

// GetWeeklyCycleCounts fetches cycle counts for the current week (or all recent counts for the store, or all stores if storeID <= 0)
func (r *CycleCountRepo) GetWeeklyCycleCounts(ctx context.Context, storeID int) ([]models.CycleCountSummary, error) {
	query := `
		SELECT 
			cc.count_id, cc.store_id, c.name AS category_name, cc.category_id, cc.status,
			CASE WHEN e.employee_id IS NOT NULL THEN e.first_name || ' ' || e.last_name ELSE NULL END AS counted_by_name,
			cc.total_items, cc.counted_items, cc.count_date, cc.total_variance_cost
		FROM cycle_counts cc
		JOIN categories c ON cc.category_id = c.category_id
		LEFT JOIN employees e ON cc.counted_by = e.employee_id
		WHERE ($1 <= 0 OR cc.store_id = $1)
		ORDER BY 
			CASE cc.status 
				WHEN 'IN PROGRESS' THEN 1 
				WHEN 'PENDING APPROVAL' THEN 2 
				WHEN 'NOT STARTED' THEN 3 
				WHEN 'COMPLETED' THEN 4 
				WHEN 'APPROVED' THEN 5 
				ELSE 6 
			END, 
			cc.count_date DESC, cc.count_id DESC
	`

	rows, err := r.db.QueryContext(ctx, query, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var summaries []models.CycleCountSummary
	for rows.Next() {
		var s models.CycleCountSummary
		if err := rows.Scan(
			&s.CountId, &s.StoreId, &s.CategoryName, &s.CategoryId, &s.Status,
			&s.CountedByName, &s.TotalItems, &s.CountedItems, &s.CountDate, &s.TotalVarianceCost,
		); err != nil {
			return nil, err
		}
		summaries = append(summaries, s)
	}

	if summaries == nil {
		summaries = []models.CycleCountSummary{}
	}

	return summaries, rows.Err()
}

// GetCycleCountByID retrieves a single count by ID for a store (or any store if storeID <= 0)
func (r *CycleCountRepo) GetCycleCountByID(ctx context.Context, countID int, storeID int) (*models.CycleCount, error) {
	query := `
		SELECT 
			cc.count_id, cc.store_id, cc.count_date, cc.category_id, c.name AS category_name,
			cc.status, cc.counted_by,
			CASE WHEN e.employee_id IS NOT NULL THEN e.first_name || ' ' || e.last_name ELSE NULL END AS counted_by_name,
			cc.approved_by,
			CASE WHEN ae.employee_id IS NOT NULL THEN ae.first_name || ' ' || ae.last_name ELSE NULL END AS approved_by_name,
			cc.total_variance_cost, cc.total_items, cc.counted_items,
			cc.started_at, cc.completed_at, cc.approved_at, cc.notes
		FROM cycle_counts cc
		JOIN categories c ON cc.category_id = c.category_id
		LEFT JOIN employees e ON cc.counted_by = e.employee_id
		LEFT JOIN employees ae ON cc.approved_by = ae.employee_id
		WHERE cc.count_id = $1 AND ($2 <= 0 OR cc.store_id = $2)
	`

	var cc models.CycleCount
	err := r.db.QueryRowContext(ctx, query, countID, storeID).Scan(
		&cc.CountId, &cc.StoreId, &cc.CountDate, &cc.CategoryId, &cc.CategoryName,
		&cc.Status, &cc.CountedBy, &cc.CountedByName,
		&cc.ApprovedBy, &cc.ApprovedByName,
		&cc.TotalVarianceCost, &cc.TotalItems, &cc.CountedItems,
		&cc.StartedAt, &cc.CompletedAt, &cc.ApprovedAt, &cc.Notes,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &cc, nil
}

// GetCycleCountItems retrieves all items belonging to a count
func (r *CycleCountRepo) GetCycleCountItems(ctx context.Context, countID int) ([]models.CycleCountItemDetail, error) {
	query := `
		SELECT 
			cci.count_item_id, cci.count_id, cci.product_id, p.name AS product_name,
			p.sku, p.upc, p.brand, COALESCE(ps.cost_price, 0) AS cost_price,
			cci.expected_qty, cci.counted_qty, cci.variance, cci.variance_cost,
			cci.reason_code, cci.scanned_at, cci.scanned_by
		FROM cycle_count_items cci
		JOIN products p ON cci.product_id = p.product_id
		LEFT JOIN product_suppliers ps ON p.product_id = ps.product_id AND ps.is_primary = true
		WHERE cci.count_id = $1
		ORDER BY p.name ASC
	`

	rows, err := r.db.QueryContext(ctx, query, countID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.CycleCountItemDetail
	for rows.Next() {
		var item models.CycleCountItemDetail
		if err := rows.Scan(
			&item.CountItemId, &item.CountId, &item.ProductId, &item.ProductName,
			&item.Sku, &item.Upc, &item.Brand, &item.CostPrice,
			&item.ExpectedQty, &item.CountedQty, &item.Variance, &item.VarianceCost,
			&item.ReasonCode, &item.ScannedAt, &item.ScannedBy,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	if items == nil {
		items = []models.CycleCountItemDetail{}
	}

	return items, rows.Err()
}

// StartCycleCount creates a new cycle count and populates items snapshot from inventory
func (r *CycleCountRepo) StartCycleCount(ctx context.Context, storeID int, categoryID int, employeeID int) (*models.CycleCount, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Insert parent count
	var countID int
	insertCountQuery := `
		INSERT INTO cycle_counts (
			store_id, count_date, category_id, status, counted_by, started_at, total_items, counted_items
		) VALUES (
			$1, CURRENT_DATE, $2, 'IN PROGRESS', $3, NOW(), 0, 0
		) RETURNING count_id
	`
	err = tx.QueryRowContext(ctx, insertCountQuery, storeID, categoryID, employeeID).Scan(&countID)
	if err != nil {
		return nil, fmt.Errorf("failed to insert cycle count: %w", err)
	}

	// Fetch all products in category and snapshot current on_hand_qty as expected_qty
	fetchProductsQuery := `
		SELECT p.product_id, COALESCE(i.on_hand_qty, 0) AS expected_qty
		FROM products p
		LEFT JOIN inventory i ON p.product_id = i.product_id AND i.store_id = $1
		WHERE p.category_id = $2 AND p.is_active = true
		ORDER BY p.name ASC
	`
	pRows, err := tx.QueryContext(ctx, fetchProductsQuery, storeID, categoryID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch products for category: %w", err)
	}
	defer pRows.Close()

	type prodItem struct {
		productID   int
		expectedQty int
	}
	var products []prodItem
	for pRows.Next() {
		var p prodItem
		if err := pRows.Scan(&p.productID, &p.expectedQty); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	if err := pRows.Err(); err != nil {
		return nil, err
	}

	insertItemQuery := `
		INSERT INTO cycle_count_items (
			count_id, product_id, expected_qty, counted_qty, variance_cost
		) VALUES ($1, $2, $3, 0, 0)
	`
	for _, p := range products {
		_, err = tx.ExecContext(ctx, insertItemQuery, countID, p.productID, p.expectedQty)
		if err != nil {
			return nil, fmt.Errorf("failed to insert cycle count item: %w", err)
		}
	}

	// Update total_items on cycle_counts
	_, err = tx.ExecContext(ctx, `UPDATE cycle_counts SET total_items = $1 WHERE count_id = $2`, len(products), countID)
	if err != nil {
		return nil, fmt.Errorf("failed to update total_items: %w", err)
	}

	// Link schedule entry if one exists for today
	linkScheduleQuery := `
		UPDATE cycle_count_schedule
		SET cycle_count_id = $1
		WHERE store_id = $2 AND category_id = $3 AND scheduled_date = CURRENT_DATE AND cycle_count_id IS NULL
	`
	_, _ = tx.ExecContext(ctx, linkScheduleQuery, countID, storeID, categoryID)

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.GetCycleCountByID(ctx, countID, storeID)
}

// AutoAssignCycleCount atomically assigns an unassigned cycle count to an employee
func (r *CycleCountRepo) AutoAssignCycleCount(ctx context.Context, countID int, storeID int, employeeID int) (*models.CycleCount, error) {
	query := `
		UPDATE cycle_counts
		SET counted_by = $1,
			started_at = COALESCE(started_at, NOW()),
			status = CASE WHEN status = 'NOT STARTED' THEN 'IN PROGRESS'::cycle_count_status ELSE status END
		WHERE count_id = $2 AND ($3 <= 0 OR store_id = $3) AND (counted_by IS NULL OR counted_by = $1)
	`
	_, err := r.db.ExecContext(ctx, query, employeeID, countID, storeID)
	if err != nil {
		return nil, fmt.Errorf("failed to auto-assign cycle count: %w", err)
	}

	return r.GetCycleCountByID(ctx, countID, storeID)
}

// RecordScan updates or adds a counted product in a cycle count (supporting 0-qty and unlisted products)
func (r *CycleCountRepo) RecordScan(ctx context.Context, storeID int, req models.RecordScanRequest, employeeID int) (*models.CycleCountItemDetail, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Verify count belongs to store
	var countStatus models.CycleCountStatus
	err = tx.QueryRowContext(ctx, `SELECT status FROM cycle_counts WHERE count_id = $1 AND store_id = $2`, req.CountId, storeID).Scan(&countStatus)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("cycle count %d not found for store %d", req.CountId, storeID)
		}
		return nil, err
	}

	// 1. Resolve Product ID
	var productID int
	if req.ProductId != nil && *req.ProductId > 0 {
		productID = *req.ProductId
	} else if req.Barcode != nil && *req.Barcode != "" {
		barcode := strings.TrimSpace(*req.Barcode)
		err = tx.QueryRowContext(ctx, `
			SELECT product_id FROM products 
			WHERE upc = $1 OR sku = $1 
			LIMIT 1
		`, barcode).Scan(&productID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, fmt.Errorf("product with barcode/SKU %s not found in master catalog", barcode)
			}
			return nil, err
		}
	} else {
		return nil, errors.New("must provide product_id or barcode")
	}

	// 2. Get primary cost price for calculating variance_cost
	var costPrice float64
	_ = tx.QueryRowContext(ctx, `
		SELECT COALESCE(cost_price, 0) FROM product_suppliers WHERE product_id = $1 AND is_primary = true LIMIT 1
	`, productID).Scan(&costPrice)

	// 3. Check if item is already part of cycle_count_items
	var expectedQty, currentCountedQty int
	err = tx.QueryRowContext(ctx, `
		SELECT expected_qty, counted_qty 
		FROM cycle_count_items 
		WHERE count_id = $1 AND product_id = $2
	`, req.CountId, productID).Scan(&expectedQty, &currentCountedQty)

	var targetQty int
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Product is not in initial count items snapshot (0 quantity or unlisted in category)
			// Check if store has any existing on_hand_qty in inventory
			var storeInvQty int
			_ = tx.QueryRowContext(ctx, `
				SELECT COALESCE(on_hand_qty, 0) FROM inventory WHERE store_id = $1 AND product_id = $2
			`, storeID, productID).Scan(&storeInvQty)
			expectedQty = storeInvQty

			if req.CountedQty != nil {
				targetQty = *req.CountedQty
			} else {
				targetQty = 1
			}

			variance := targetQty - expectedQty
			varianceCost := float64(variance) * costPrice

			reason := "0-quantity stock found during count"
			if req.ReasonCode != nil && *req.ReasonCode != "" {
				reason = *req.ReasonCode
			}

			// Insert newly discovered product into cycle_count_items
			insertQuery := `
				INSERT INTO cycle_count_items (
					count_id, product_id, expected_qty, counted_qty, variance_cost, reason_code, scanned_at, scanned_by
				) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
			`
			_, err = tx.ExecContext(ctx, insertQuery, req.CountId, productID, expectedQty, targetQty, varianceCost, reason, employeeID)
			if err != nil {
				return nil, fmt.Errorf("failed to add new item to cycle count: %w", err)
			}

			// Increment total_items on parent count
			_, err = tx.ExecContext(ctx, `UPDATE cycle_counts SET total_items = total_items + 1 WHERE count_id = $1`, req.CountId)
			if err != nil {
				return nil, fmt.Errorf("failed to increment total_items: %w", err)
			}
		} else {
			return nil, err
		}
	} else {
		// Existing item in count
		if req.CountedQty != nil {
			targetQty = *req.CountedQty
		} else {
			targetQty = currentCountedQty + 1
		}

		variance := targetQty - expectedQty
		varianceCost := float64(variance) * costPrice

		updateItemQuery := `
			UPDATE cycle_count_items
			SET counted_qty = $1,
				variance_cost = $2,
				reason_code = COALESCE($3, reason_code),
				scanned_at = NOW(),
				scanned_by = $4
			WHERE count_id = $5 AND product_id = $6
		`
		_, err = tx.ExecContext(ctx, updateItemQuery, targetQty, varianceCost, req.ReasonCode, employeeID, req.CountId, productID)
		if err != nil {
			return nil, fmt.Errorf("failed to update cycle count item: %w", err)
		}
	}

	// 4. Recalculate counted_items and total_variance_cost on parent
	updateParentQuery := `
		UPDATE cycle_counts
		SET counted_items = (SELECT COUNT(*) FROM cycle_count_items WHERE count_id = $1 AND counted_qty > 0),
			total_variance_cost = (SELECT COALESCE(SUM(variance_cost), 0) FROM cycle_count_items WHERE count_id = $1),
			status = CASE WHEN status = 'NOT STARTED' THEN 'IN PROGRESS'::cycle_count_status ELSE status END,
			started_at = COALESCE(started_at, NOW())
		WHERE count_id = $1
	`
	_, err = tx.ExecContext(ctx, updateParentQuery, req.CountId)
	if err != nil {
		return nil, fmt.Errorf("failed to update cycle count aggregates: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Fetch updated item
	itemQuery := `
		SELECT 
			cci.count_item_id, cci.count_id, cci.product_id, p.name AS product_name,
			p.sku, p.upc, p.brand, COALESCE(ps.cost_price, 0) AS cost_price,
			cci.expected_qty, cci.counted_qty, cci.variance, cci.variance_cost,
			cci.reason_code, cci.scanned_at, cci.scanned_by
		FROM cycle_count_items cci
		JOIN products p ON cci.product_id = p.product_id
		LEFT JOIN product_suppliers ps ON p.product_id = ps.product_id AND ps.is_primary = true
		WHERE cci.count_id = $1 AND cci.product_id = $2
	`
	var item models.CycleCountItemDetail
	err = r.db.QueryRowContext(ctx, itemQuery, req.CountId, productID).Scan(
		&item.CountItemId, &item.CountId, &item.ProductId, &item.ProductName,
		&item.Sku, &item.Upc, &item.Brand, &item.CostPrice,
		&item.ExpectedQty, &item.CountedQty, &item.Variance, &item.VarianceCost,
		&item.ReasonCode, &item.ScannedAt, &item.ScannedBy,
	)
	if err != nil {
		return nil, err
	}

	return &item, nil
}

// SubmitForApproval transitions count to PENDING APPROVAL and sets completion metadata
func (r *CycleCountRepo) SubmitForApproval(ctx context.Context, storeID int, countID int, notes *string) error {
	query := `
		UPDATE cycle_counts
		SET status = 'PENDING APPROVAL',
			completed_at = NOW(),
			notes = COALESCE($1, notes),
			total_variance_cost = (SELECT COALESCE(SUM(variance_cost), 0) FROM cycle_count_items WHERE count_id = $2)
		WHERE count_id = $2 AND store_id = $3
	`
	res, err := r.db.ExecContext(ctx, query, notes, countID, storeID)
	if err != nil {
		return err
	}
	rowsAff, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAff == 0 {
		return fmt.Errorf("cycle count %d not found for store %d", countID, storeID)
	}
	return nil
}

// ApproveCycleCount marks count as APPROVED, updates store inventory, and logs to audit trail (inventory_transactions)
func (r *CycleCountRepo) ApproveCycleCount(ctx context.Context, storeID int, countID int, approverID int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Update cycle_counts status to APPROVED
	updateCountQuery := `
		UPDATE cycle_counts
		SET status = 'APPROVED',
			approved_by = $1,
			approved_at = NOW()
		WHERE count_id = $2 AND store_id = $3
	`
	res, err := tx.ExecContext(ctx, updateCountQuery, approverID, countID, storeID)
	if err != nil {
		return fmt.Errorf("failed to update cycle count status: %w", err)
	}
	rowsAff, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAff == 0 {
		return fmt.Errorf("cycle count %d not found for store %d", countID, storeID)
	}

	// Fetch all items for this count with their cost price
	itemsQuery := `
		SELECT 
			cci.product_id, cci.expected_qty, cci.counted_qty, cci.variance,
			COALESCE(ps.cost_price, 0) AS cost_price,
			COALESCE(cci.reason_code, 'Cycle Count Reconciliation') AS reason_code
		FROM cycle_count_items cci
		JOIN products p ON cci.product_id = p.product_id
		LEFT JOIN product_suppliers ps ON p.product_id = ps.product_id AND ps.is_primary = true
		WHERE cci.count_id = $1
	`
	rows, err := tx.QueryContext(ctx, itemsQuery, countID)
	if err != nil {
		return fmt.Errorf("failed to query cycle count items: %w", err)
	}
	defer rows.Close()

	type countItemRow struct {
		productID   int
		expectedQty int
		countedQty  int
		variance    int
		costPrice   float64
		reasonCode  string
	}
	var items []countItemRow
	for rows.Next() {
		var it countItemRow
		if err := rows.Scan(&it.productID, &it.expectedQty, &it.countedQty, &it.variance, &it.costPrice, &it.reasonCode); err != nil {
			return err
		}
		items = append(items, it)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	// For each item, update inventory and insert audit transaction log
	updateInvQuery := `
		INSERT INTO inventory (store_id, product_id, new_qty, last_counted_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (store_id, product_id)
		DO UPDATE SET
			new_qty = EXCLUDED.new_qty,
			last_counted_at = NOW(),
			updated_at = NOW()
	`

	auditQuery := `
		INSERT INTO inventory_transactions (
			product_id, to_store_id, transaction_type, quantity, unit_cost, reason_code, employee_id, reference_id
		) VALUES ($1, $2, 'CYCLE_COUNT', $3, $4, $5, $6, $7)
	`

	refID := fmt.Sprintf("CYCLE_COUNT:%d", countID)

	for _, it := range items {
		// Update inventory table
		_, err = tx.ExecContext(ctx, updateInvQuery, storeID, it.productID, it.countedQty)
		if err != nil {
			return fmt.Errorf("failed to update inventory for product %d: %w", it.productID, err)
		}

		// Log to audit trail in inventory_transactions
		_, err = tx.ExecContext(ctx, auditQuery,
			it.productID, storeID, it.variance, it.costPrice, it.reasonCode, approverID, refID,
		)
		if err != nil {
			return fmt.Errorf("failed to log audit transaction for product %d: %w", it.productID, err)
		}
	}

	return tx.Commit()
}

// TransferOwnership reassigns an active cycle count to another employee
func (r *CycleCountRepo) TransferOwnership(ctx context.Context, storeID int, countID int, newEmployeeID int) error {
	query := `
		UPDATE cycle_counts
		SET counted_by = $1
		WHERE count_id = $2 AND store_id = $3
	`
	res, err := r.db.ExecContext(ctx, query, newEmployeeID, countID, storeID)
	if err != nil {
		return fmt.Errorf("failed to transfer cycle count ownership: %w", err)
	}
	rowsAff, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAff == 0 {
		return fmt.Errorf("cycle count %d not found for store %d", countID, storeID)
	}
	return nil
}

// SearchCycleCounts allows searching cycle counts by free text, status, category, date range
func (r *CycleCountRepo) SearchCycleCounts(ctx context.Context, storeID int, criteria models.CycleCountSearchCriteria) ([]models.CycleCountSummary, error) {
	baseQuery := `
		SELECT 
			cc.count_id, cc.store_id, c.name AS category_name, cc.category_id, cc.status,
			CASE WHEN e.employee_id IS NOT NULL THEN e.first_name || ' ' || e.last_name ELSE NULL END AS counted_by_name,
			cc.total_items, cc.counted_items, cc.count_date, cc.total_variance_cost
		FROM cycle_counts cc
		JOIN categories c ON cc.category_id = c.category_id
		LEFT JOIN employees e ON cc.counted_by = e.employee_id
		WHERE ($1 <= 0 OR cc.store_id = $1)
	`
	args := []any{storeID}
	paramIdx := 2

	if criteria.Query != "" {
		q := "%" + strings.ToLower(criteria.Query) + "%"
		baseQuery += fmt.Sprintf(` AND (
			LOWER(c.name) LIKE $%d OR 
			LOWER(COALESCE(e.first_name || ' ' || e.last_name, '')) LIKE $%d OR 
			CAST(cc.count_id AS TEXT) LIKE $%d
		)`, paramIdx, paramIdx, paramIdx)
		args = append(args, q)
		paramIdx++
	}

	if criteria.Status != "" && criteria.Status != "ALL" {
		baseQuery += fmt.Sprintf(` AND cc.status = $%d`, paramIdx)
		args = append(args, criteria.Status)
		paramIdx++
	}

	if criteria.CategoryId != nil {
		baseQuery += fmt.Sprintf(` AND cc.category_id = $%d`, paramIdx)
		args = append(args, *criteria.CategoryId)
		paramIdx++
	}

	if criteria.DateFrom != nil && *criteria.DateFrom != "" {
		baseQuery += fmt.Sprintf(` AND cc.count_date >= $%d::date`, paramIdx)
		args = append(args, *criteria.DateFrom)
		paramIdx++
	}

	if criteria.DateTo != nil && *criteria.DateTo != "" {
		baseQuery += fmt.Sprintf(` AND cc.count_date <= $%d::date`, paramIdx)
		args = append(args, *criteria.DateTo)
		paramIdx++
	}

	baseQuery += ` ORDER BY cc.count_date DESC, cc.count_id DESC LIMIT 100`

	rows, err := r.db.QueryContext(ctx, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var summaries []models.CycleCountSummary
	for rows.Next() {
		var s models.CycleCountSummary
		if err := rows.Scan(
			&s.CountId, &s.StoreId, &s.CategoryName, &s.CategoryId, &s.Status,
			&s.CountedByName, &s.TotalItems, &s.CountedItems, &s.CountDate, &s.TotalVarianceCost,
		); err != nil {
			return nil, err
		}
		summaries = append(summaries, s)
	}

	if summaries == nil {
		summaries = []models.CycleCountSummary{}
	}

	return summaries, rows.Err()
}

// GetSchedule returns scheduled cycle counts for calendar view
func (r *CycleCountRepo) GetSchedule(ctx context.Context, storeID int, fromDate time.Time, toDate time.Time) ([]models.CycleCountScheduleEntry, error) {
	query := `
		SELECT 
			ccs.schedule_id, ccs.store_id, ccs.category_id, c.name AS category_name,
			ccs.scheduled_date, ccs.created_by,
			CASE WHEN e.employee_id IS NOT NULL THEN e.first_name || ' ' || e.last_name ELSE NULL END AS created_by_name,
			ccs.cycle_count_id, cc.status::TEXT AS count_status
		FROM cycle_count_schedule ccs
		JOIN categories c ON ccs.category_id = c.category_id
		LEFT JOIN employees e ON ccs.created_by = e.employee_id
		LEFT JOIN cycle_counts cc ON ccs.cycle_count_id = cc.count_id
		WHERE ($1 <= 0 OR ccs.store_id = $1) AND ccs.scheduled_date >= $2 AND ccs.scheduled_date <= $3
		ORDER BY ccs.scheduled_date ASC
	`

	rows, err := r.db.QueryContext(ctx, query, storeID, fromDate, toDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []models.CycleCountScheduleEntry
	for rows.Next() {
		var e models.CycleCountScheduleEntry
		if err := rows.Scan(
			&e.ScheduleId, &e.StoreId, &e.CategoryId, &e.CategoryName,
			&e.ScheduledDate, &e.CreatedBy, &e.CreatedByName,
			&e.CycleCountId, &e.CountStatus,
		); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}

	if entries == nil {
		entries = []models.CycleCountScheduleEntry{}
	}

	return entries, rows.Err()
}

// CreateScheduleEntry inserts a new schedule item
func (r *CycleCountRepo) CreateScheduleEntry(ctx context.Context, storeID int, categoryID int, scheduledDate time.Time, createdBy int) (*models.CycleCountScheduleEntry, error) {
	query := `
		INSERT INTO cycle_count_schedule (store_id, category_id, scheduled_date, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING schedule_id
	`
	var scheduleID int
	err := r.db.QueryRowContext(ctx, query, storeID, categoryID, scheduledDate, createdBy).Scan(&scheduleID)
	if err != nil {
		return nil, err
	}

	// Return populated entry
	fetchQuery := `
		SELECT 
			ccs.schedule_id, ccs.store_id, ccs.category_id, c.name AS category_name,
			ccs.scheduled_date, ccs.created_by,
			CASE WHEN e.employee_id IS NOT NULL THEN e.first_name || ' ' || e.last_name ELSE NULL END AS created_by_name,
			ccs.cycle_count_id, NULL AS count_status
		FROM cycle_count_schedule ccs
		JOIN categories c ON ccs.category_id = c.category_id
		LEFT JOIN employees e ON ccs.created_by = e.employee_id
		WHERE ccs.schedule_id = $1
	`
	var e models.CycleCountScheduleEntry
	err = r.db.QueryRowContext(ctx, fetchQuery, scheduleID).Scan(
		&e.ScheduleId, &e.StoreId, &e.CategoryId, &e.CategoryName,
		&e.ScheduledDate, &e.CreatedBy, &e.CreatedByName,
		&e.CycleCountId, &e.CountStatus,
	)
	if err != nil {
		return nil, err
	}

	return &e, nil
}
