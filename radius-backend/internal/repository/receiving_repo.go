// radius-backend/internal/repository/receiving_repo.go
package repository

import (
	"context"
	"database/sql"
	"fmt"
	"radius/internal/models"
	"time"
)

type ReceivingRepo struct {
	db *sql.DB
}

func NewReceivingRepo(db *sql.DB) *ReceivingRepo {
	return &ReceivingRepo{db: db}
}

func (r *ReceivingRepo) GetPurchaseOrders(ctx context.Context, storeID *int) ([]models.PurchaseOrderSummary, error) {
	query := `
		SELECT po.po_id, po.store_id, s.name, sup.name, po.status,
			COUNT(poi.po_item_id), po.ordered_at, po.expected_at, po.arrived_at,
			EXISTS (SELECT 1 FROM purchase_order_lprs lpr WHERE lpr.po_id = po.po_id)
		FROM purchase_orders po
		JOIN stores s ON po.store_id = s.store_id
		JOIN suppliers sup ON po.supplier_id = sup.supplier_id
		JOIN purchase_orders_items poi ON poi.po_id = po.po_id
		WHERE po.status IN ('SHIPPED', 'DELIVERING', 'DELIVERED', 'PARTIAL')
	`
	var args []any
	if storeID != nil {
		args = append(args, *storeID)
		query += fmt.Sprintf(" AND po.store_id = $%d", len(args))
	}
	query += " GROUP BY po.po_id, s.name, sup.name ORDER BY po.ordered_at DESC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.PurchaseOrderSummary
	for rows.Next() {
		var po models.PurchaseOrderSummary
		if err := rows.Scan(
			&po.PoId, &po.StoreId, &po.StoreName, &po.SupplierName, &po.Status,
			&po.ItemCount, &po.OrderedAt, &po.ExpectedAt, &po.ArrivedAt, &po.HasLprs,
		); err != nil {
			return nil, err
		}
		results = append(results, po)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if results == nil {
		results = []models.PurchaseOrderSummary{}
	}
	return results, nil
}

func (r *ReceivingRepo) GetPurchaseOrderDetail(ctx context.Context, poID int) (*models.PurchaseOrderDetailResponse, error) {
	// Get PO header
	headerQuery := `
		SELECT po.po_id, po.store_id, sup.name, po.status, po.ordered_at, po.expected_at, po.arrived_at,
			EXISTS (SELECT 1 FROM purchase_order_lprs lpr WHERE lpr.po_id = po.po_id)
		FROM purchase_orders po
		JOIN suppliers sup ON po.supplier_id = sup.supplier_id
		WHERE po.po_id = $1
	`
	var detail models.PurchaseOrderDetailResponse
	err := r.db.QueryRowContext(ctx, headerQuery, poID).Scan(
		&detail.PoId, &detail.StoreId, &detail.SupplierName, &detail.Status,
		&detail.OrderedAt, &detail.ExpectedAt, &detail.ArrivedAt, &detail.HasLprs,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	// Get PO items with product info
	itemsQuery := `
		SELECT poi.po_item_id, p.product_id, p.sku, p.upc, p.name, p.brand,
			poi.qty_ordered, poi.qty_received, poi.unit_cost
		FROM purchase_orders_items poi
		JOIN products p ON poi.product_id = p.product_id
		WHERE poi.po_id = $1
		ORDER BY poi.po_item_id
	`
	rows, err := r.db.QueryContext(ctx, itemsQuery, poID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item models.PurchaseOrderItemDetail
		if err := rows.Scan(
			&item.PoItemId, &item.ProductId, &item.Sku, &item.Upc, &item.Name, &item.Brand,
			&item.QtyOrdered, &item.QtyReceived, &item.UnitCost,
		); err != nil {
			return nil, err
		}
		detail.Items = append(detail.Items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if detail.Items == nil {
		detail.Items = []models.PurchaseOrderItemDetail{}
	}

	// Get LPRs
	lprsQuery := `
		SELECT lpr_id, lpr_barcode, is_received, received_at
		FROM purchase_order_lprs
		WHERE po_id = $1
		ORDER BY lpr_id
	`
	lprRows, err := r.db.QueryContext(ctx, lprsQuery, poID)
	if err != nil {
		return nil, err
	}
	defer lprRows.Close()

	for lprRows.Next() {
		var lpr models.PurchaseOrderLPR
		if err := lprRows.Scan(&lpr.LprId, &lpr.LprBarcode, &lpr.IsReceived, &lpr.ReceivedAt); err != nil {
			return nil, err
		}
		detail.Lprs = append(detail.Lprs, lpr)
	}
	if err := lprRows.Err(); err != nil {
		return nil, err
	}
	if detail.Lprs == nil {
		detail.Lprs = []models.PurchaseOrderLPR{}
	}

	return &detail, nil
}

func (r *ReceivingRepo) CheckProductInPO(ctx context.Context, poID int, barcode string) (*models.PurchaseOrderItemDetail, error) {
	query := `
		SELECT poi.po_item_id, p.product_id, p.sku, p.upc, p.name, p.brand,
			poi.qty_ordered, poi.qty_received, poi.unit_cost
		FROM purchase_orders_items poi
		JOIN products p ON poi.product_id = p.product_id
		WHERE poi.po_id = $1 AND (p.upc = $2 OR p.sku = $2)
		LIMIT 1
	`
	var item models.PurchaseOrderItemDetail
	err := r.db.QueryRowContext(ctx, query, poID, barcode).Scan(
		&item.PoItemId, &item.ProductId, &item.Sku, &item.Upc, &item.Name, &item.Brand,
		&item.QtyOrdered, &item.QtyReceived, &item.UnitCost,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *ReceivingRepo) ReceivePOItems(ctx context.Context, storeID int, poID int, employeeID int, items []models.ReceivePOItemEntry) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, item := range items {
		// Update PO item qty_received
		_, err := tx.ExecContext(ctx,
			`UPDATE purchase_orders_items SET qty_received = qty_received + $1 WHERE po_item_id = $2 AND po_id = $3`,
			item.QtyReceived, item.PoItemId, poID,
		)
		if err != nil {
			return err
		}

		// Increment store inventory
		var productID int
		var unitCost float64
		err = tx.QueryRowContext(ctx,
			`SELECT product_id, unit_cost FROM purchase_orders_items WHERE po_item_id = $1`,
			item.PoItemId,
		).Scan(&productID, &unitCost)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx,
			`UPDATE inventory SET on_hand_qty = on_hand_qty + $1, updated_at = NOW() WHERE product_id = $2 AND store_id = $3`,
			item.QtyReceived, productID, storeID,
		)
		if err != nil {
			return err
		}

		// Log to audit trail
		auditQuery := `
			INSERT INTO inventory_transactions
				(product_id, to_store_id, transaction_type, quantity, unit_cost, employee_id, reference_id)
			VALUES ($1, $2, 'RECEIPT', $3, $4, $5, $6)
		`
		refId := fmt.Sprintf("PO:%d", poID)
		_, err = tx.ExecContext(ctx, auditQuery, productID, storeID, item.QtyReceived, unitCost, employeeID, refId)
		if err != nil {
			return err
		}
	}

	// Auto-update PO status
	err = updatePOStatusInTx(ctx, tx, poID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *ReceivingRepo) ReceiveLPR(ctx context.Context, storeID int, poID int, lprBarcode string, employeeID int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Get LPR
	var lprID int
	var isReceived bool
	err = tx.QueryRowContext(ctx,
		`SELECT lpr_id, is_received FROM purchase_order_lprs WHERE po_id = $1 AND lpr_barcode = $2`,
		poID, lprBarcode,
	).Scan(&lprID, &isReceived)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("LPR barcode not found in this PO")
		}
		return err
	}
	if isReceived {
		return fmt.Errorf("LPR already received")
	}

	// Mark LPR as received
	now := time.Now()
	_, err = tx.ExecContext(ctx,
		`UPDATE purchase_order_lprs SET is_received = true, received_by = $1, received_at = $2 WHERE lpr_id = $3`,
		employeeID, now, lprID,
	)
	if err != nil {
		return err
	}

	// Get all LPR items and update PO items + inventory
	rows, err := tx.QueryContext(ctx,
		`SELECT li.po_item_id, li.qty, poi.product_id, poi.unit_cost
		FROM purchase_order_lpr_items li
		JOIN purchase_orders_items poi ON li.po_item_id = poi.po_item_id
		WHERE li.lpr_id = $1`,
		lprID,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	type lprItem struct {
		poItemID  int
		qty       int
		productID int
		unitCost  float64
	}
	var lprItems []lprItem
	for rows.Next() {
		var li lprItem
		if err := rows.Scan(&li.poItemID, &li.qty, &li.productID, &li.unitCost); err != nil {
			return err
		}
		lprItems = append(lprItems, li)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, li := range lprItems {
		_, err = tx.ExecContext(ctx,
			`UPDATE purchase_orders_items SET qty_received = qty_received + $1 WHERE po_item_id = $2`,
			li.qty, li.poItemID,
		)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx,
			`UPDATE inventory SET on_hand_qty = on_hand_qty + $1, updated_at = NOW() WHERE product_id = $2 AND store_id = $3`,
			li.qty, li.productID, storeID,
		)
		if err != nil {
			return err
		}

		// Log to audit trail
		auditQuery := `
			INSERT INTO inventory_transactions
				(product_id, to_store_id, transaction_type, quantity, unit_cost, employee_id, reference_id)
			VALUES ($1, $2, 'RECEIPT', $3, $4, $5, $6)
		`
		refId := fmt.Sprintf("PO:%d", poID)
		_, err = tx.ExecContext(ctx, auditQuery, li.productID, storeID, li.qty, li.unitCost, employeeID, refId)
		if err != nil {
			return err
		}
	}

	// Auto-update PO status
	err = updatePOStatusInTx(ctx, tx, poID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func updatePOStatusInTx(ctx context.Context, tx *sql.Tx, poID int) error {
	var totalOrdered, totalReceived int
	err := tx.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(qty_ordered), 0), COALESCE(SUM(qty_received), 0) FROM purchase_orders_items WHERE po_id = $1`,
		poID,
	).Scan(&totalOrdered, &totalReceived)
	if err != nil {
		return err
	}

	var newStatus string
	if totalReceived >= totalOrdered {
		newStatus = "RECEIVED"
	} else if totalReceived > 0 {
		newStatus = "PARTIAL"
	} else {
		newStatus = "SHIPPED"
	}

	_, err = tx.ExecContext(ctx,
		`UPDATE purchase_orders 
		 SET status = $1::purchase_orders_status, 
		     arrived_at = COALESCE(arrived_at, NOW()) 
		 WHERE po_id = $2`,
		newStatus, poID,
	)
	return err
}

// ---- Stock Transfers ----

func (r *ReceivingRepo) GetStockTransfers(ctx context.Context, storeID *int) ([]models.StockTransferSummary, error) {
	query := `
		SELECT st.transfer_id, st.from_store_id, fs.name, st.to_store_id, ts.name,
			st.status, COALESCE(st.manual_check_required, false), COUNT(sti.transfer_item_id), st.created_at
		FROM stock_transfers st
		JOIN stores fs ON st.from_store_id = fs.store_id
		JOIN stores ts ON st.to_store_id = ts.store_id
		JOIN stock_transfer_items sti ON sti.transfer_id = st.transfer_id
		WHERE st.status = 'IN_TRANSIT'
	`
	var args []any
	if storeID != nil {
		args = append(args, *storeID)
		query += fmt.Sprintf(" AND st.to_store_id = $%d", len(args))
	}
	query += " GROUP BY st.transfer_id, fs.name, ts.name ORDER BY st.created_at DESC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.StockTransferSummary
	for rows.Next() {
		var t models.StockTransferSummary
		if err := rows.Scan(
			&t.TransferId, &t.FromStoreId, &t.FromStoreName, &t.ToStoreId, &t.ToStoreName,
			&t.Status, &t.ManualCheckRequired, &t.ItemCount, &t.CreatedAt,
		); err != nil {
			return nil, err
		}
		results = append(results, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if results == nil {
		results = []models.StockTransferSummary{}
	}
	return results, nil
}

func (r *ReceivingRepo) GetStockTransferDetail(ctx context.Context, transferID int) (*models.StockTransferDetailResponse, error) {
	headerQuery := `
		SELECT st.transfer_id, fs.name, ts.name, st.status, COALESCE(st.manual_check_required, false), st.created_at
		FROM stock_transfers st
		JOIN stores fs ON st.from_store_id = fs.store_id
		JOIN stores ts ON st.to_store_id = ts.store_id
		WHERE st.transfer_id = $1
	`
	var detail models.StockTransferDetailResponse
	err := r.db.QueryRowContext(ctx, headerQuery, transferID).Scan(
		&detail.TransferId, &detail.FromStoreName, &detail.ToStoreName,
		&detail.Status, &detail.ManualCheckRequired, &detail.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	itemsQuery := `
		SELECT sti.transfer_item_id, p.product_id, p.sku, p.upc, p.name, p.brand,
			sti.qty_requested, sti.qty_sent, sti.qty_received
		FROM stock_transfer_items sti
		JOIN products p ON sti.product_id = p.product_id
		WHERE sti.transfer_id = $1
		ORDER BY sti.transfer_item_id
	`
	rows, err := r.db.QueryContext(ctx, itemsQuery, transferID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item models.StockTransferItemDetail
		if err := rows.Scan(
			&item.TransferItemId, &item.ProductId, &item.Sku, &item.Upc, &item.Name, &item.Brand,
			&item.QtyRequested, &item.QtySent, &item.QtyReceived,
		); err != nil {
			return nil, err
		}
		detail.Items = append(detail.Items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if detail.Items == nil {
		detail.Items = []models.StockTransferItemDetail{}
	}

	return &detail, nil
}

func (r *ReceivingRepo) CheckProductInTransfer(ctx context.Context, transferID int, barcode string) (*models.StockTransferItemDetail, error) {
	query := `
		SELECT sti.transfer_item_id, p.product_id, p.sku, p.upc, p.name, p.brand,
			sti.qty_requested, sti.qty_sent, sti.qty_received
		FROM stock_transfer_items sti
		JOIN products p ON sti.product_id = p.product_id
		WHERE sti.transfer_id = $1 AND (p.upc = $2 OR p.sku = $2)
		LIMIT 1
	`
	var item models.StockTransferItemDetail
	err := r.db.QueryRowContext(ctx, query, transferID, barcode).Scan(
		&item.TransferItemId, &item.ProductId, &item.Sku, &item.Upc, &item.Name, &item.Brand,
		&item.QtyRequested, &item.QtySent, &item.QtyReceived,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *ReceivingRepo) ReceiveTransferItems(ctx context.Context, storeID int, transferID int, employeeID int, items []models.ReceiveTransferItemEntry) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, item := range items {
		// Update transfer item qty_received
		_, err := tx.ExecContext(ctx,
			`UPDATE stock_transfer_items SET qty_received = COALESCE(qty_received, 0) + $1 WHERE transfer_item_id = $2 AND transfer_id = $3`,
			item.QtyReceived, item.TransferItemId, transferID,
		)
		if err != nil {
			return err
		}

		// Increment store inventory
		var productID int
		err = tx.QueryRowContext(ctx,
			`SELECT product_id FROM stock_transfer_items WHERE transfer_item_id = $1`,
			item.TransferItemId,
		).Scan(&productID)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx,
			`UPDATE inventory SET on_hand_qty = on_hand_qty + $1, updated_at = NOW() WHERE product_id = $2 AND store_id = $3`,
			item.QtyReceived, productID, storeID,
		)
		if err != nil {
			return err
		}

		// Log to audit trail
		auditQuery := `
			INSERT INTO inventory_transactions
				(product_id, to_store_id, transaction_type, quantity, employee_id, reference_id)
			VALUES ($1, $2, 'RECEIPT', $3, $4, $5)
		`
		refId := fmt.Sprintf("TRANSFER:%d", transferID)
		_, err = tx.ExecContext(ctx, auditQuery, productID, storeID, item.QtyReceived, employeeID, refId)
		if err != nil {
			return err
		}
	}

	// Auto-update transfer status
	err = updateTransferStatusInTx(ctx, tx, transferID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *ReceivingRepo) QuickReceiveTransfer(ctx context.Context, storeID int, transferID int, employeeID int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Get all transfer items
	rows, err := tx.QueryContext(ctx,
		`SELECT transfer_item_id, product_id, COALESCE(qty_sent, qty_requested) FROM stock_transfer_items WHERE transfer_id = $1`,
		transferID,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	type transferItem struct {
		transferItemID int
		productID      int
		qty            int
	}
	var transferItems []transferItem
	for rows.Next() {
		var ti transferItem
		if err := rows.Scan(&ti.transferItemID, &ti.productID, &ti.qty); err != nil {
			return err
		}
		transferItems = append(transferItems, ti)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, ti := range transferItems {
		_, err = tx.ExecContext(ctx,
			`UPDATE stock_transfer_items SET qty_received = $1 WHERE transfer_item_id = $2`,
			ti.qty, ti.transferItemID,
		)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx,
			`UPDATE inventory SET on_hand_qty = on_hand_qty + $1, updated_at = NOW() WHERE product_id = $2 AND store_id = $3`,
			ti.qty, ti.productID, storeID,
		)
		if err != nil {
			return err
		}

		// Log to audit trail
		auditQuery := `
			INSERT INTO inventory_transactions
				(product_id, to_store_id, transaction_type, quantity, employee_id, reference_id)
			VALUES ($1, $2, 'RECEIPT', $3, $4, $5)
		`
		refId := fmt.Sprintf("TRANSFER:%d", transferID)
		_, err = tx.ExecContext(ctx, auditQuery, ti.productID, storeID, ti.qty, employeeID, refId)
		if err != nil {
			return err
		}
	}

	// Mark transfer as received
	now := time.Now()
	_, err = tx.ExecContext(ctx,
		`UPDATE stock_transfers SET status = 'RECEIVED'::stock_transfer_status, received_at = $1 WHERE transfer_id = $2`,
		now, transferID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func updateTransferStatusInTx(ctx context.Context, tx *sql.Tx, transferID int) error {
	var totalSent, totalReceived int
	err := tx.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(COALESCE(qty_sent, qty_requested)), 0), COALESCE(SUM(COALESCE(qty_received, 0)), 0) FROM stock_transfer_items WHERE transfer_id = $1`,
		transferID,
	).Scan(&totalSent, &totalReceived)
	if err != nil {
		return err
	}

	if totalReceived >= totalSent {
		now := time.Now()
		_, err = tx.ExecContext(ctx,
			`UPDATE stock_transfers SET status = 'RECEIVED'::stock_transfer_status, received_at = $1 WHERE transfer_id = $2`,
			now, transferID,
		)
		return err
	}
	return nil
}
