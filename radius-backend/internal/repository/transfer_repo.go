package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"radius/internal/models"
	"time"
)

type TransferRepo struct {
	db *sql.DB
}

func NewTransferRepo(db *sql.DB) *TransferRepo {
	return &TransferRepo{db: db}
}

func (r *TransferRepo) CreateTransfer(ctx context.Context, fromStoreID int, toStoreID int, requestedBy int, reason string, manualCheck bool, items []models.CreateTransferItemEntry) (*models.StockTransfer, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var totalTransferCost float64
	for _, item := range items {
		var availableQty int
		var costPrice float64
		err := tx.QueryRowContext(ctx,
			`SELECT i.new_qty, COALESCE(p.cost_price, 0)
			 FROM inventory i
			 JOIN products p ON i.product_id = p.product_id
			 WHERE i.store_id = $1 AND i.product_id = $2`,
			fromStoreID, item.ProductId,
		).Scan(&availableQty, &costPrice)
		if err != nil {
			if err == sql.ErrNoRows {
				return nil, fmt.Errorf("product %d not found in store inventory", item.ProductId)
			}
			return nil, err
		}

		if availableQty < item.QtyRequested {
			return nil, fmt.Errorf("insufficient inventory for product %d: available %d, requested %d", item.ProductId, availableQty, item.QtyRequested)
		}

		totalTransferCost += costPrice * float64(item.QtyRequested)

		res, err := tx.ExecContext(ctx,
			`UPDATE inventory
			 SET new_qty = new_qty - $1,
			     in_transit_qty = in_transit_qty + $1,
			     updated_at = NOW()
			 WHERE store_id = $2 AND product_id = $3 AND new_qty >= $1`,
			item.QtyRequested, fromStoreID, item.ProductId,
		)
		if err != nil {
			return nil, err
		}
		rowsAffected, err := res.RowsAffected()
		if err != nil {
			return nil, err
		}
		if rowsAffected == 0 {
			return nil, fmt.Errorf("insufficient stock to deduct for product %d", item.ProductId)
		}
	}

	var transfer models.StockTransfer
	transfer.FromStoreId = fromStoreID
	transfer.ToStoreId = toStoreID
	transfer.Status = models.TransferStatusPending
	transfer.RequestedBy = requestedBy

	err = tx.QueryRowContext(ctx,
		`INSERT INTO stock_transfers
		 (from_store_id, to_store_id, status, requested_by, transfer_reason, manual_check_required, total_transfer_cost, created_at)
		 VALUES ($1, $2, 'PENDING', $3, $4, $5, $6, NOW())
		 RETURNING transfer_id, created_at`,
		fromStoreID, toStoreID, requestedBy, reason, manualCheck, totalTransferCost,
	).Scan(&transfer.TransferId, &transfer.CreatedAt)
	if err != nil {
		return nil, err
	}

	for _, item := range items {
		_, err = tx.ExecContext(ctx,
			`INSERT INTO stock_transfer_items (transfer_id, product_id, qty_requested)
			 VALUES ($1, $2, $3)`,
			transfer.TransferId, item.ProductId, item.QtyRequested,
		)
		if err != nil {
			return nil, err
		}

		refID := fmt.Sprintf("TRANSFER:%d", transfer.TransferId)
		_, err = tx.ExecContext(ctx,
			`INSERT INTO inventory_transactions
			 (product_id, from_store_id, to_store_id, transaction_type, quantity, employee_id, reference_id)
			 VALUES ($1, $2, $3, 'TRANSFER', $4, $5, $6)`,
			item.ProductId, fromStoreID, toStoreID, item.QtyRequested, requestedBy, refID,
		)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &transfer, nil
}

func (r *TransferRepo) GetOutboundTransfers(ctx context.Context, storeID *int, limit, offset int) ([]models.OutboundTransferSummary, int, error) {
	countQuery := `SELECT COUNT(*) FROM stock_transfers st`
	var countArgs []any
	if storeID != nil {
		countArgs = append(countArgs, *storeID)
		countQuery += fmt.Sprintf(" WHERE st.from_store_id = $%d", len(countArgs))
	}

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT st.transfer_id, st.from_store_id, fs.name, st.to_store_id, ts.name,
			st.status, COALESCE(st.manual_check_required, false),
			COUNT(sti.transfer_item_id), COALESCE(st.total_transfer_cost, 0),
			st.transfer_reason, st.carrier, st.tracking_number,
			st.created_at, st.shipped_at
		FROM stock_transfers st
		JOIN stores fs ON st.from_store_id = fs.store_id
		JOIN stores ts ON st.to_store_id = ts.store_id
		LEFT JOIN stock_transfer_items sti ON sti.transfer_id = st.transfer_id
	`
	var args []any
	if storeID != nil {
		args = append(args, *storeID)
		query += fmt.Sprintf(" WHERE st.from_store_id = $%d", len(args))
	}
	query += " GROUP BY st.transfer_id, fs.name, ts.name ORDER BY st.created_at DESC"

	args = append(args, limit)
	query += fmt.Sprintf(" LIMIT $%d", len(args))

	args = append(args, offset)
	query += fmt.Sprintf(" OFFSET $%d", len(args))

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	results := make([]models.OutboundTransferSummary, 0)
	for rows.Next() {
		var t models.OutboundTransferSummary
		if err := rows.Scan(
			&t.TransferId, &t.FromStoreId, &t.FromStoreName, &t.ToStoreId, &t.ToStoreName,
			&t.Status, &t.ManualCheckRequired, &t.ItemCount, &t.TotalTransferCost,
			&t.TransferReason, &t.Carrier, &t.TrackingNumber,
			&t.CreatedAt, &t.ShippedAt,
		); err != nil {
			return nil, 0, err
		}
		results = append(results, t)
	}

	return results, total, nil
}

func (r *TransferRepo) GetOutboundTransferDetail(ctx context.Context, transferID int) (*models.OutboundTransferDetailResponse, error) {
	headerQuery := `
		SELECT st.transfer_id, st.from_store_id, fs.name, st.to_store_id, ts.name,
			st.status, st.requested_by, CONCAT(e.first_name, ' ', e.last_name),
			st.transfer_reason, st.carrier, st.tracking_number,
			COALESCE(st.manual_check_required, false), COALESCE(st.total_transfer_cost, 0),
			st.created_at, st.shipped_at, st.received_at
		FROM stock_transfers st
		JOIN stores fs ON st.from_store_id = fs.store_id
		JOIN stores ts ON st.to_store_id = ts.store_id
		JOIN employees e ON st.requested_by = e.employee_id
		WHERE st.transfer_id = $1
	`
	var detail models.OutboundTransferDetailResponse
	err := r.db.QueryRowContext(ctx, headerQuery, transferID).Scan(
		&detail.TransferId, &detail.FromStoreId, &detail.FromStoreName, &detail.ToStoreId, &detail.ToStoreName,
		&detail.Status, &detail.RequestedBy, &detail.RequestedByName,
		&detail.TransferReason, &detail.Carrier, &detail.TrackingNumber,
		&detail.ManualCheckRequired, &detail.TotalTransferCost,
		&detail.CreatedAt, &detail.ShippedAt, &detail.ReceivedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
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

	detail.Items = make([]models.StockTransferItemDetail, 0)
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

	return &detail, nil
}

func (r *TransferRepo) DispatchTransfer(ctx context.Context, transferID int, carrier, trackingNumber *string) (*models.StockTransfer, int, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback()

	var transfer models.StockTransfer
	err = tx.QueryRowContext(ctx,
		`SELECT transfer_id, from_store_id, to_store_id, status, requested_by, created_at, received_at
		 FROM stock_transfers
		 WHERE transfer_id = $1
		 FOR UPDATE`,
		transferID,
	).Scan(
		&transfer.TransferId, &transfer.FromStoreId, &transfer.ToStoreId,
		&transfer.Status, &transfer.RequestedBy, &transfer.CreatedAt, &transfer.ReceivedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, 0, errors.New("transfer not found")
		}
		return nil, 0, err
	}

	if transfer.Status != models.TransferStatusPending {
		return nil, 0, fmt.Errorf("transfer cannot be dispatched because status is %s", transfer.Status)
	}

	now := time.Now()
	_, err = tx.ExecContext(ctx,
		`UPDATE stock_transfers
		 SET status = 'IN_TRANSIT', shipped_at = $1, carrier = $2, tracking_number = $3
		 WHERE transfer_id = $4`,
		now, carrier, trackingNumber, transferID,
	)
	if err != nil {
		return nil, 0, err
	}

	_, err = tx.ExecContext(ctx,
		`UPDATE stock_transfer_items
		 SET qty_sent = qty_requested
		 WHERE transfer_id = $1`,
		transferID,
	)
	if err != nil {
		return nil, 0, err
	}

	if err := tx.Commit(); err != nil {
		return nil, 0, err
	}

	transfer.Status = models.TransferStatusInTransit
	return &transfer, transfer.ToStoreId, nil
}

func (r *TransferRepo) CancelTransfer(ctx context.Context, transferID int, employeeID int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var fromStoreID, toStoreID int
	var status string
	err = tx.QueryRowContext(ctx,
		`SELECT from_store_id, to_store_id, status
		 FROM stock_transfers
		 WHERE transfer_id = $1
		 FOR UPDATE`,
		transferID,
	).Scan(&fromStoreID, &toStoreID, &status)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errors.New("transfer not found")
		}
		return err
	}

	if status != string(models.TransferStatusPending) {
		return fmt.Errorf("transfer cannot be cancelled because status is %s", status)
	}

	rows, err := tx.QueryContext(ctx,
		`SELECT product_id, qty_requested FROM stock_transfer_items WHERE transfer_id = $1`,
		transferID,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	type refundItem struct {
		productID int
		qty       int
	}
	var items []refundItem
	for rows.Next() {
		var it refundItem
		if err := rows.Scan(&it.productID, &it.qty); err != nil {
			return err
		}
		items = append(items, it)
	}

	for _, it := range items {
		_, err = tx.ExecContext(ctx,
			`UPDATE inventory
			 SET new_qty = new_qty + $1,
			     in_transit_qty = in_transit_qty - $1,
			     updated_at = NOW()
			 WHERE store_id = $2 AND product_id = $3`,
			it.qty, fromStoreID, it.productID,
		)
		if err != nil {
			return err
		}

		refID := fmt.Sprintf("TRANSFER:%d", transferID)
		_, err = tx.ExecContext(ctx,
			`INSERT INTO inventory_transactions
			 (product_id, from_store_id, to_store_id, transaction_type, quantity, employee_id, reference_id, reason_code)
			 VALUES ($1, $2, $3, 'ADJUSTMENT', $4, $5, $6, 'TRANSFER_CANCELLED')`,
			it.productID, fromStoreID, toStoreID, it.qty, employeeID, refID,
		)
		if err != nil {
			return err
		}
	}

	_, err = tx.ExecContext(ctx,
		`UPDATE stock_transfers SET status = 'CANCELLED' WHERE transfer_id = $1`,
		transferID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *TransferRepo) GetDestinationStores(ctx context.Context, fromStoreID int) ([]models.TransferDestinationStore, error) {
	query := `
		SELECT store_id, name, city, province, (store_id = 1) AS is_head_office
		FROM stores
		WHERE store_id != $1 AND store_id != 1 AND is_active = true
		ORDER BY name ASC
	`
	rows, err := r.db.QueryContext(ctx, query, fromStoreID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stores := make([]models.TransferDestinationStore, 0)
	for rows.Next() {
		var s models.TransferDestinationStore
		if err := rows.Scan(&s.StoreId, &s.Name, &s.City, &s.Province, &s.IsHeadOffice); err != nil {
			return nil, err
		}
		stores = append(stores, s)
	}

	return stores, nil
}

