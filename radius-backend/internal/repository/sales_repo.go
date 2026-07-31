// radius-backend/internal/repository/sales_repo.go
package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
)

type SalesRepo struct {
	db *sql.DB
}

func NewSalesRepo(db *sql.DB) *SalesRepo {
	return &SalesRepo{db: db}
}

func (r *SalesRepo) CreateTransaction(ctx context.Context) {
}

func (r *SalesRepo) GetAllTransactions(ctx context.Context, limit, offset int, storeID *int) ([]models.Transaction, int, error) {
	var countQuery string
	var query string
	var args []any
	var countArgs []any

	if storeID != nil {
		countQuery = `
			SELECT COUNT(*)
			FROM transactions
			WHERE store_id = $1
		`
		query = `
			SELECT transaction_id, store_id, register_id, employee_id, transaction_type, subtotal, tax_amount, total_amount, payment_method, status, created_at
			FROM transactions
			WHERE store_id = $1
			ORDER BY transaction_id ASC
			LIMIT $2 OFFSET $3
		`
		args = []any{*storeID, limit, offset}
		countArgs = []any{*storeID}
	} else {
		countQuery = `
			SELECT COUNT(*)
			FROM transactions
		`
		query = `
			SELECT transaction_id, store_id, register_id, employee_id, transaction_type, subtotal, tax_amount, total_amount, payment_method, status, created_at
			FROM transactions
			ORDER BY transaction_id ASC
			LIMIT $1 OFFSET $2
		`
		args = []any{limit, offset}
		countArgs = []any{}
	}

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var transactions []models.Transaction
	for rows.Next() {
		var t models.Transaction
		if err := rows.Scan(
			&t.TransactionId, &t.StoreId, &t.RegisterId, &t.EmployeeId, &t.TransactionType,
			&t.Subtotal, &t.TaxAmount, &t.TotalAmount, &t.PaymentMethod, &t.Status, &t.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		transactions = append(transactions, t)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	if transactions == nil {
		transactions = []models.Transaction{}
	}

	return transactions, total, nil
}

func (r *SalesRepo) GetTransactionByID(ctx context.Context, id int, storeID *int) (*models.Transaction, []models.TransactionItem, error) {
	var query string
	var args []any

	if storeID != nil {
		query = `
			SELECT transaction_id, store_id, register_id, employee_id, transaction_type, subtotal, tax_amount, total_amount, payment_method, status, created_at
			FROM transactions WHERE transaction_id = $1 AND store_id = $2
		`
		args = []any{id, *storeID}
	} else {
		query = `
			SELECT transaction_id, store_id, register_id, employee_id, transaction_type, subtotal, tax_amount, total_amount, payment_method, status, created_at FROM transactions WHERE transaction_id = $1
		`
		args = []any{id}
	}

	var t models.Transaction
	err := r.db.QueryRowContext(ctx, query, args...).Scan(
		&t.TransactionId, &t.StoreId, &t.RegisterId, &t.EmployeeId, &t.TransactionType,
		&t.Subtotal, &t.TaxAmount, &t.TotalAmount, &t.PaymentMethod, &t.Status, &t.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil, nil // Not found
		}
		return nil, nil, err
	}

	itemQuery := `
		SELECT transaction_item_id, transaction_id, product_id, quantity, unit_price, discount_amount, scanned_barcode
		FROM transaction_items
		WHERE transaction_id = $1
	`
	rows, err := r.db.QueryContext(ctx, itemQuery, id)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var items []models.TransactionItem
	for rows.Next() {
		var i models.TransactionItem
		if err := rows.Scan(
			&i.TransactionItemId, &i.TransactionId, &i.ProductId, &i.Quantity,
			&i.UnitPrice, &i.DiscountAmount, &i.ScannedBarcode,
		); err != nil {
			return nil, nil, err
		}
		items = append(items, i)
	}

	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	if items == nil {
		items = []models.TransactionItem{}
	}

	return &t, items, nil
}

func (r *SalesRepo) GetProductTransactions(ctx context.Context, sku int) {
}
