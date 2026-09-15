package repository

import (
	"context"
	"database/sql"
	"fmt"
	"radius/internal/models"
	"strings"
	"time"
)

type ReturnsRepo struct {
	db *sql.DB
}

func NewReturnsRepo(db *sql.DB) *ReturnsRepo {
	return &ReturnsRepo{db: db}
}

func (r *ReturnsRepo) CreateReturn(ctx context.Context, storeID int, employeeID int, status models.ReturnStatus, req models.CreateReturnRequest) (*models.CustomerReturn, []models.CustomerReturnItem, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	var subtotal float64
	for _, item := range req.Items {
		subtotal += item.UnitPrice * float64(item.Quantity)
	}
	taxAmount := subtotal * 0.05
	totalRefund := subtotal + taxAmount
	isStoreCredit := req.RefundMethod == models.RefundMethodStoreCredit

	var approvedBy *int
	var approvedAt *time.Time
	var completedAt *time.Time
	now := time.Now().UTC()

	if status == models.ReturnStatusCompleted {
		approvedBy = &employeeID
		approvedAt = &now
		completedAt = &now
	}

	var createdReturn models.CustomerReturn
	createdReturn.StoreId = storeID
	createdReturn.OriginalTransactionId = req.OriginalTransactionId
	createdReturn.EmployeeId = employeeID
	createdReturn.Status = status
	createdReturn.RefundMethod = req.RefundMethod
	createdReturn.Subtotal = subtotal
	createdReturn.TaxAmount = taxAmount
	createdReturn.TotalRefund = totalRefund
	createdReturn.IsStoreCredit = isStoreCredit
	createdReturn.Notes = req.Notes
	createdReturn.ApprovedBy = approvedBy
	createdReturn.ApprovedAt = approvedAt
	createdReturn.CompletedAt = completedAt

	insertReturnQuery := `
		INSERT INTO customer_returns (
			store_id, original_transaction_id, employee_id, status, refund_method,
			subtotal, tax_amount, total_refund, is_store_credit, notes,
			approved_by, approved_at, created_at, completed_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13)
		RETURNING return_id, created_at
	`

	err = tx.QueryRowContext(
		ctx,
		insertReturnQuery,
		storeID,
		req.OriginalTransactionId,
		employeeID,
		status,
		req.RefundMethod,
		subtotal,
		taxAmount,
		totalRefund,
		isStoreCredit,
		req.Notes,
		approvedBy,
		approvedAt,
		completedAt,
	).Scan(&createdReturn.ReturnId, &createdReturn.CreatedAt)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to insert customer return: %w", err)
	}

	insertItemStmt, err := tx.PrepareContext(ctx, `
		INSERT INTO customer_return_items (
			return_id, product_id, original_transaction_item_id, quantity,
			unit_price, unit_cost, tax_amount, return_reason, disposition, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
		RETURNING return_item_id, created_at
	`)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to prepare return item stmt: %w", err)
	}
	defer insertItemStmt.Close()

	var createdItems []models.CustomerReturnItem
	refID := fmt.Sprintf("RET-%d", createdReturn.ReturnId)

	for _, itemReq := range req.Items {
		var unitCost float64
		_ = tx.QueryRowContext(ctx, `SELECT COALESCE(default_cost, 0.0) FROM products WHERE product_id = $1`, itemReq.ProductId).Scan(&unitCost)

		itemTax := (itemReq.UnitPrice * float64(itemReq.Quantity)) * 0.05

		var item models.CustomerReturnItem
		item.ReturnId = createdReturn.ReturnId
		item.ProductId = itemReq.ProductId
		item.OriginalTransactionItemId = itemReq.OriginalTransactionItemId
		item.Quantity = itemReq.Quantity
		item.UnitPrice = itemReq.UnitPrice
		item.UnitCost = unitCost
		item.TaxAmount = itemTax
		item.ReturnReason = itemReq.ReturnReason
		item.Disposition = itemReq.Disposition

		err = insertItemStmt.QueryRowContext(
			ctx,
			createdReturn.ReturnId,
			itemReq.ProductId,
			itemReq.OriginalTransactionItemId,
			itemReq.Quantity,
			itemReq.UnitPrice,
			unitCost,
			itemTax,
			itemReq.ReturnReason,
			itemReq.Disposition,
		).Scan(&item.ReturnItemId, &item.CreatedAt)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to insert return item for product %d: %w", itemReq.ProductId, err)
		}

		if status == models.ReturnStatusCompleted {
			if err := r.processItemDispositionTx(ctx, tx, storeID, employeeID, refID, item); err != nil {
				return nil, nil, err
			}
		}

		createdItems = append(createdItems, item)
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, fmt.Errorf("failed to commit return transaction: %w", err)
	}

	return &createdReturn, createdItems, nil
}

func (r *ReturnsRepo) processItemDispositionTx(ctx context.Context, tx *sql.Tx, storeID int, employeeID int, refID string, item models.CustomerReturnItem) error {
	var inventoryUpdateQuery string
	switch item.Disposition {
	case models.ReturnDispositionRestock:
		inventoryUpdateQuery = `
			UPDATE inventory
			SET new_qty = new_qty + $1, updated_at = NOW()
			WHERE store_id = $2 AND product_id = $3
		`
	case models.ReturnDispositionOpenBox:
		inventoryUpdateQuery = `
			UPDATE inventory
			SET open_box_qty = open_box_qty + $1, updated_at = NOW()
			WHERE store_id = $2 AND product_id = $3
		`
	case models.ReturnDispositionDefectiveRtv:
		inventoryUpdateQuery = `
			UPDATE inventory
			SET rtv_qty = rtv_qty + $1, updated_at = NOW()
			WHERE store_id = $2 AND product_id = $3
		`
	case models.ReturnDispositionQuarantine:
		inventoryUpdateQuery = `
			UPDATE inventory
			SET quarantine_qty = quarantine_qty + $1, updated_at = NOW()
			WHERE store_id = $2 AND product_id = $3
		`
	case models.ReturnDispositionDamagedWriteOff:
		inventoryUpdateQuery = ""
	}

	if inventoryUpdateQuery != "" {
		res, err := tx.ExecContext(ctx, inventoryUpdateQuery, item.Quantity, storeID, item.ProductId)
		if err != nil {
			return fmt.Errorf("failed to update inventory for product %d: %w", item.ProductId, err)
		}
		rowsAffected, _ := res.RowsAffected()
		if rowsAffected == 0 {
			var initNew, initOpen, initRtv, initQuar int
			switch item.Disposition {
			case models.ReturnDispositionRestock:
				initNew = item.Quantity
			case models.ReturnDispositionOpenBox:
				initOpen = item.Quantity
			case models.ReturnDispositionDefectiveRtv:
				initRtv = item.Quantity
			case models.ReturnDispositionQuarantine:
				initQuar = item.Quantity
			}
			_, err = tx.ExecContext(ctx, `
				INSERT INTO inventory (store_id, product_id, new_qty, open_box_qty, rtv_qty, quarantine_qty, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, NOW())
				ON CONFLICT (store_id, product_id) DO UPDATE
				SET new_qty = inventory.new_qty + EXCLUDED.new_qty,
				    open_box_qty = inventory.open_box_qty + EXCLUDED.open_box_qty,
				    rtv_qty = inventory.rtv_qty + EXCLUDED.rtv_qty,
				    quarantine_qty = inventory.quarantine_qty + EXCLUDED.quarantine_qty,
				    updated_at = NOW()
			`, storeID, item.ProductId, initNew, initOpen, initRtv, initQuar)
			if err != nil {
				return fmt.Errorf("failed to upsert inventory record for product %d: %w", item.ProductId, err)
			}
		}
	}

	txType := "RETURN"
	if item.Disposition == models.ReturnDispositionDamagedWriteOff {
		txType = "WRITE_OFF"
	}

	_, err := tx.ExecContext(ctx, `
		INSERT INTO inventory_transactions (
			product_id, to_store_id, transaction_type, quantity, unit_price, unit_cost,
			employee_id, reference_id, reason_code, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
	`, item.ProductId, storeID, txType, item.Quantity, item.UnitPrice, item.UnitCost, employeeID, refID, item.ReturnReason)
	if err != nil {
		return fmt.Errorf("failed to log inventory transaction for return item %d: %w", item.ReturnItemId, err)
	}

	if item.Disposition == models.ReturnDispositionDefectiveRtv {
		var supplierID *int
		_ = tx.QueryRowContext(ctx, `
			SELECT supplier_id FROM product_suppliers
			WHERE product_id = $1
			ORDER BY is_primary DESC, supplier_id ASC
			LIMIT 1
		`, item.ProductId).Scan(&supplierID)

		_, err = tx.ExecContext(ctx, `
			INSERT INTO rtv_queue (
				return_item_id, store_id, product_id, quantity, status, supplier_id, created_at
			)
			VALUES ($1, $2, $3, $4, 'QUEUED', $5, NOW())
		`, item.ReturnItemId, storeID, item.ProductId, item.Quantity, supplierID)
		if err != nil {
			return fmt.Errorf("failed to enqueue RTV request for product %d: %w", item.ProductId, err)
		}
	}

	return nil
}

func (r *ReturnsRepo) ApproveReturn(ctx context.Context, returnID int, approverID int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	var storeID int
	var status models.ReturnStatus
	err = tx.QueryRowContext(ctx, `
		SELECT store_id, status FROM customer_returns WHERE return_id = $1 FOR UPDATE
	`, returnID).Scan(&storeID, &status)
	if err != nil {
		return fmt.Errorf("failed to find return #%d: %w", returnID, err)
	}

	if status != models.ReturnStatusPendingApproval {
		return fmt.Errorf("return is in '%s' status and cannot be approved", status)
	}

	rows, err := tx.QueryContext(ctx, `
		SELECT return_item_id, return_id, product_id, original_transaction_item_id,
		       quantity, unit_price, unit_cost, tax_amount, return_reason, disposition, created_at
		FROM customer_return_items
		WHERE return_id = $1
	`, returnID)
	if err != nil {
		return fmt.Errorf("failed to query return items: %w", err)
	}
	defer rows.Close()

	var items []models.CustomerReturnItem
	for rows.Next() {
		var item models.CustomerReturnItem
		if err := rows.Scan(
			&item.ReturnItemId, &item.ReturnId, &item.ProductId, &item.OriginalTransactionItemId,
			&item.Quantity, &item.UnitPrice, &item.UnitCost, &item.TaxAmount, &item.ReturnReason,
			&item.Disposition, &item.CreatedAt,
		); err != nil {
			return fmt.Errorf("failed to scan return item: %w", err)
		}
		items = append(items, item)
	}

	refID := fmt.Sprintf("RET-%d", returnID)
	for _, item := range items {
		if err := r.processItemDispositionTx(ctx, tx, storeID, approverID, refID, item); err != nil {
			return err
		}
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE customer_returns
		SET status = 'COMPLETED', approved_by = $1, approved_at = NOW(), completed_at = NOW()
		WHERE return_id = $2
	`, approverID, returnID)
	if err != nil {
		return fmt.Errorf("failed to update customer return status: %w", err)
	}

	return tx.Commit()
}

func (r *ReturnsRepo) RejectReturn(ctx context.Context, returnID int, approverID int, reason string) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE customer_returns
		SET status = 'REJECTED', approved_by = $1, approved_at = NOW(),
		    notes = CASE
		        WHEN notes IS NULL OR notes = '' THEN 'Rejection reason: ' || $2
		        ELSE notes || E'\nRejection reason: ' || $2
		    END
		WHERE return_id = $3 AND status = 'PENDING_APPROVAL'
	`, approverID, reason, returnID)
	if err != nil {
		return fmt.Errorf("failed to reject return #%d: %w", returnID, err)
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("return #%d not found or not in pending approval status", returnID)
	}
	return nil
}

func (r *ReturnsRepo) GetReturns(ctx context.Context, storeID *int, criteria models.ReturnSearchCriteria, limit, offset int) ([]models.CustomerReturnSummary, int, error) {
	var conditions []string
	var args []any
	argIdx := 1

	if storeID != nil {
		conditions = append(conditions, fmt.Sprintf("cr.store_id = $%d", argIdx))
		args = append(args, *storeID)
		argIdx++
	} else if criteria.StoreId != nil {
		conditions = append(conditions, fmt.Sprintf("cr.store_id = $%d", argIdx))
		args = append(args, *criteria.StoreId)
		argIdx++
	}

	if criteria.Status != nil && *criteria.Status != "" {
		conditions = append(conditions, fmt.Sprintf("cr.status = $%d", argIdx))
		args = append(args, *criteria.Status)
		argIdx++
	}

	if criteria.DateFrom != nil && *criteria.DateFrom != "" {
		conditions = append(conditions, fmt.Sprintf("cr.created_at >= $%d", argIdx))
		args = append(args, *criteria.DateFrom)
		argIdx++
	}

	if criteria.DateTo != nil && *criteria.DateTo != "" {
		conditions = append(conditions, fmt.Sprintf("cr.created_at <= $%d", argIdx))
		args = append(args, *criteria.DateTo)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM customer_returns cr
		%s
	`, whereClause)

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT cr.return_id, cr.store_id, s.name AS store_name, cr.original_transaction_id,
		       cr.employee_id, e.first_name || ' ' || e.last_name AS employee_name,
		       cr.status, cr.refund_method, cr.total_refund,
		       (SELECT COUNT(*) FROM customer_return_items cri WHERE cri.return_id = cr.return_id) AS item_count,
		       cr.is_store_credit, cr.created_at,
		       app.first_name || ' ' || app.last_name AS approved_by_name
		FROM customer_returns cr
		LEFT JOIN stores s ON cr.store_id = s.store_id
		LEFT JOIN employees e ON cr.employee_id = e.employee_id
		LEFT JOIN employees app ON cr.approved_by = app.employee_id
		%s
		ORDER BY cr.return_id DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var returns []models.CustomerReturnSummary
	for rows.Next() {
		var s models.CustomerReturnSummary
		var approvedByName sql.NullString
		if err := rows.Scan(
			&s.ReturnId, &s.StoreId, &s.StoreName, &s.OriginalTransactionId,
			&s.EmployeeId, &s.EmployeeName, &s.Status, &s.RefundMethod, &s.TotalRefund,
			&s.ItemCount, &s.IsStoreCredit, &s.CreatedAt, &approvedByName,
		); err != nil {
			return nil, 0, err
		}
		if approvedByName.Valid {
			s.ApprovedByName = &approvedByName.String
		}
		returns = append(returns, s)
	}

	if returns == nil {
		returns = []models.CustomerReturnSummary{}
	}

	return returns, total, nil
}

func (r *ReturnsRepo) GetReturnDetail(ctx context.Context, returnID int) (*models.CustomerReturnSummary, []models.CustomerReturnItemDetail, error) {
	query := `
		SELECT cr.return_id, cr.store_id, s.name AS store_name, cr.original_transaction_id,
		       cr.employee_id, e.first_name || ' ' || e.last_name AS employee_name,
		       cr.status, cr.refund_method, cr.total_refund,
		       (SELECT COUNT(*) FROM customer_return_items cri WHERE cri.return_id = cr.return_id) AS item_count,
		       cr.is_store_credit, cr.created_at,
		       app.first_name || ' ' || app.last_name AS approved_by_name
		FROM customer_returns cr
		LEFT JOIN stores s ON cr.store_id = s.store_id
		LEFT JOIN employees e ON cr.employee_id = e.employee_id
		LEFT JOIN employees app ON cr.approved_by = app.employee_id
		WHERE cr.return_id = $1
	`

	var s models.CustomerReturnSummary
	var approvedByName sql.NullString
	err := r.db.QueryRowContext(ctx, query, returnID).Scan(
		&s.ReturnId, &s.StoreId, &s.StoreName, &s.OriginalTransactionId,
		&s.EmployeeId, &s.EmployeeName, &s.Status, &s.RefundMethod, &s.TotalRefund,
		&s.ItemCount, &s.IsStoreCredit, &s.CreatedAt, &approvedByName,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil, nil
		}
		return nil, nil, err
	}
	if approvedByName.Valid {
		s.ApprovedByName = &approvedByName.String
	}

	itemQuery := `
		SELECT cri.return_item_id, cri.return_id, cri.product_id, p.name AS product_name,
		       p.sku, p.upc, p.brand, cri.original_transaction_item_id, cri.quantity,
		       cri.unit_price, cri.unit_cost, cri.tax_amount, cri.return_reason,
		       cri.disposition, cri.created_at
		FROM customer_return_items cri
		LEFT JOIN products p ON cri.product_id = p.product_id
		WHERE cri.return_id = $1
		ORDER BY cri.return_item_id ASC
	`
	rows, err := r.db.QueryContext(ctx, itemQuery, returnID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var items []models.CustomerReturnItemDetail
	for rows.Next() {
		var item models.CustomerReturnItemDetail
		if err := rows.Scan(
			&item.ReturnItemId, &item.ReturnId, &item.ProductId, &item.ProductName,
			&item.Sku, &item.Upc, &item.Brand, &item.OriginalTransactionItemId,
			&item.Quantity, &item.UnitPrice, &item.UnitCost, &item.TaxAmount,
			&item.ReturnReason, &item.Disposition, &item.CreatedAt,
		); err != nil {
			return nil, nil, err
		}
		items = append(items, item)
	}

	if items == nil {
		items = []models.CustomerReturnItemDetail{}
	}

	return &s, items, nil
}

func (r *ReturnsRepo) LookupTransaction(ctx context.Context, transactionID int64, storeID *int) (*models.LookupTransactionResponse, error) {
	var txQuery string
	var args []any
	if storeID != nil {
		txQuery = `
			SELECT transaction_id, store_id, register_id, created_at, COALESCE(payment_method::text, 'CARD'), total_amount
			FROM transactions
			WHERE transaction_id = $1 AND store_id = $2
		`
		args = []any{transactionID, *storeID}
	} else {
		txQuery = `
			SELECT transaction_id, store_id, register_id, created_at, COALESCE(payment_method::text, 'CARD'), total_amount
			FROM transactions
			WHERE transaction_id = $1
		`
		args = []any{transactionID}
	}

	var resp models.LookupTransactionResponse
	err := r.db.QueryRowContext(ctx, txQuery, args...).Scan(
		&resp.TransactionId, &resp.StoreId, &resp.RegisterId,
		&resp.CreatedAt, &resp.PaymentMethod, &resp.TotalAmount,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	resp.DaysSinceSale = int(time.Since(resp.CreatedAt).Hours() / 24)

	itemsQuery := `
		SELECT ti.transaction_item_id, ti.product_id, p.sku, p.name, p.brand,
		       p.category_id, COALESCE(p.is_returnable, TRUE), COALESCE(p.warranty_days, 0),
		       ti.quantity, ti.unit_price, ti.unit_cost,
		       COALESCE((
		           SELECT SUM(cri.quantity)
		           FROM customer_return_items cri
		           JOIN customer_returns cr ON cri.return_id = cr.return_id
		           WHERE cri.original_transaction_item_id = ti.transaction_item_id
		             AND cr.status != 'REJECTED'
		       ), 0) AS returned_qty
		FROM transaction_items ti
		JOIN products p ON ti.product_id = p.product_id
		WHERE ti.transaction_id = $1
		ORDER BY ti.transaction_item_id ASC
	`
	rows, err := r.db.QueryContext(ctx, itemsQuery, transactionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item models.OriginalTransactionItemForReturn
		var categoryID int
		var warrantyDays int
		var isReturnable bool
		if err := rows.Scan(
			&item.TransactionItemId, &item.ProductId, &item.ProductSku, &item.ProductName,
			&item.Brand, &categoryID, &isReturnable, &warrantyDays,
			&item.PurchasedQty, &item.UnitPrice, &item.UnitCost, &item.ReturnedQty,
		); err != nil {
			return nil, err
		}

		item.IsReturnable = isReturnable
		item.ReturnableQty = item.PurchasedQty - item.ReturnedQty
		if item.ReturnableQty < 0 {
			item.ReturnableQty = 0
		}

		returnWindow := 30
		if warrantyDays > 0 {
			returnWindow = warrantyDays
		} else if categoryID == 4 || categoryID == 10 || categoryID == 11 || categoryID == 13 || categoryID == 14 {
			returnWindow = 14
		}
		item.ReturnWindowDays = returnWindow
		item.IsOutsidePolicyWindow = resp.DaysSinceSale > returnWindow

		resp.Items = append(resp.Items, item)
	}

	if resp.Items == nil {
		resp.Items = []models.OriginalTransactionItemForReturn{}
	}

	return &resp, nil
}

func (r *ReturnsRepo) LookupTransactionsByProduct(ctx context.Context, barcodeOrUpc string, storeID int) ([]models.RecentTransactionSummary, error) {
	query := `
		SELECT t.transaction_id, t.store_id, t.register_id, t.total_amount, t.created_at,
		       ti.quantity, ti.unit_price
		FROM transaction_items ti
		JOIN transactions t ON ti.transaction_id = t.transaction_id
		JOIN products p ON ti.product_id = p.product_id
		WHERE t.store_id = $1
		  AND (p.upc = $2 OR p.sku = $2 OR ti.scanned_barcode = $2)
		ORDER BY t.created_at DESC
		LIMIT 20
	`
	rows, err := r.db.QueryContext(ctx, query, storeID, barcodeOrUpc)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.RecentTransactionSummary
	for rows.Next() {
		var s models.RecentTransactionSummary
		if err := rows.Scan(
			&s.TransactionId, &s.StoreId, &s.RegisterId, &s.TotalAmount, &s.CreatedAt,
			&s.QuantitySold, &s.UnitPrice,
		); err != nil {
			return nil, err
		}
		results = append(results, s)
	}

	if results == nil {
		results = []models.RecentTransactionSummary{}
	}

	return results, nil
}

func (r *ReturnsRepo) GetRtvQueue(ctx context.Context, storeID *int, status *models.RtvStatus, limit, offset int) ([]models.RtvQueueItem, int, error) {
	var conditions []string
	var args []any
	argIdx := 1

	if storeID != nil {
		conditions = append(conditions, fmt.Sprintf("rq.store_id = $%d", argIdx))
		args = append(args, *storeID)
		argIdx++
	}

	if status != nil && *status != "" {
		conditions = append(conditions, fmt.Sprintf("rq.status = $%d", argIdx))
		args = append(args, *status)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM rtv_queue rq %s`, whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT rq.rtv_id, rq.return_item_id, rq.store_id, rq.product_id,
		       p.name AS product_name, p.sku, p.upc, rq.quantity, rq.status,
		       rq.supplier_id, sup.name AS supplier_name,
		       rq.reviewed_by, rq.reviewed_at, rq.notes, rq.created_at
		FROM rtv_queue rq
		JOIN products p ON rq.product_id = p.product_id
		LEFT JOIN suppliers sup ON rq.supplier_id = sup.supplier_id
		%s
		ORDER BY rq.rtv_id DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []models.RtvQueueItem
	for rows.Next() {
		var item models.RtvQueueItem
		var supName sql.NullString
		if err := rows.Scan(
			&item.RtvId, &item.ReturnItemId, &item.StoreId, &item.ProductId,
			&item.ProductName, &item.Sku, &item.Upc, &item.Quantity, &item.Status,
			&item.SupplierId, &supName, &item.ReviewedBy, &item.ReviewedAt,
			&item.Notes, &item.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		if supName.Valid {
			item.SupplierName = &supName.String
		}
		items = append(items, item)
	}

	if items == nil {
		items = []models.RtvQueueItem{}
	}

	return items, total, nil
}

