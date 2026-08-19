package repository

import (
	"context"
	"database/sql"
	"fmt"
	"radius/internal/models"
)

type AuditRepo struct {
	db *sql.DB
}

func NewAuditRepo(db *sql.DB) *AuditRepo {
	return &AuditRepo{db: db}
}

// LogInventoryTransaction inserts a row into inventory_transactions
func (r *AuditRepo) LogInventoryTransaction(ctx context.Context, tx *sql.Tx, entry models.InventoryTransaction) error {
	query := `
		INSERT INTO inventory_transactions
			(product_id, from_store_id, to_store_id, transaction_type, quantity, unit_cost, unit_price, reason_code, employee_id, reference_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	execer := tx
	_, err := execer.ExecContext(ctx, query,
		entry.ProductId, entry.FromStoreId, entry.ToStoreId,
		entry.TransactionType, entry.Quantity, entry.UnitCost,
		entry.UnitPrice, entry.ReasonCode, entry.EmployeeId, entry.ReferenceId,
	)
	return err
}

// GetProductAuditTrail fetches the enriched audit trail for a product
func (r *AuditRepo) GetProductAuditTrail(ctx context.Context, productID int, storeID *int, filter models.AuditFilter, limit, offset int) ([]models.AuditTrailEntry, int, error) {
	baseWhere := `WHERE it.product_id = $1`
	args := []any{productID}
	paramIdx := 2

	if storeID != nil {
		baseWhere += fmt.Sprintf(` AND (it.from_store_id = $%d OR it.to_store_id = $%d)`, paramIdx, paramIdx)
		args = append(args, *storeID)
		paramIdx++
	}

	if filter.StartDate != nil {
		baseWhere += fmt.Sprintf(` AND it.created_at >= $%d`, paramIdx)
		args = append(args, *filter.StartDate)
		paramIdx++
	}
	if filter.EndDate != nil {
		baseWhere += fmt.Sprintf(` AND it.created_at <= $%d`, paramIdx)
		args = append(args, *filter.EndDate)
		paramIdx++
	}
	if filter.TransactionType != nil && *filter.TransactionType != "" {
		baseWhere += fmt.Sprintf(` AND it.transaction_type = $%d`, paramIdx)
		args = append(args, *filter.TransactionType)
		paramIdx++
	}
	if filter.EmployeeId != nil {
		baseWhere += fmt.Sprintf(` AND it.employee_id = $%d`, paramIdx)
		args = append(args, *filter.EmployeeId)
		paramIdx++
	}

	// Count query
	countQuery := `SELECT COUNT(*) FROM inventory_transactions it ` + baseWhere
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Data query with JOINs for enrichment
	sortOrder := "DESC"
	if filter.SortOrder == "ASC" {
		sortOrder = "ASC"
	}

	dataQuery := fmt.Sprintf(`
		SELECT
			it.transaction_id, it.transaction_type, it.quantity,
			it.reason_code, it.reference_id,
			CASE WHEN e.employee_id IS NOT NULL
				 THEN e.first_name || ' ' || e.last_name
				 ELSE NULL END AS employee_name,
			fs.name AS from_store_name,
			ts.name AS to_store_name,
			it.created_at
		FROM inventory_transactions it
		LEFT JOIN employees e ON it.employee_id = e.employee_id
		LEFT JOIN stores fs ON it.from_store_id = fs.store_id
		LEFT JOIN stores ts ON it.to_store_id = ts.store_id
		%s
		ORDER BY it.created_at %s LIMIT $%d OFFSET $%d`, baseWhere, sortOrder, paramIdx, paramIdx+1)
	
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var entries []models.AuditTrailEntry
	for rows.Next() {
		var e models.AuditTrailEntry
		if err := rows.Scan(
			&e.TransactionId, &e.TransactionType, &e.Quantity,
			&e.ReasonCode, &e.ReferenceId,
			&e.EmployeeName, &e.FromStoreName, &e.ToStoreName,
			&e.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []models.AuditTrailEntry{}
	}
	return entries, total, rows.Err()
}
