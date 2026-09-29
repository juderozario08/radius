package repository

import (
	"context"
	"database/sql"
	"fmt"
	"radius/internal/models"
	"radius/internal/util/queryutil"
)

type AuditRepo struct {
	db *sql.DB
}

func NewAuditRepo(db *sql.DB) *AuditRepo {
	return &AuditRepo{db: db}
}

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

func (r *AuditRepo) GetProductAuditTrail(ctx context.Context, productID int, storeID *int, filter models.AuditFilter, limit, offset int) ([]models.AuditTrailEntry, int, error) {
	b := queryutil.NewBuilder()
	b.Add("it.product_id = $%d", productID)

	if storeID != nil {
		b.Add("(it.from_store_id = $%d OR it.to_store_id = $%d)", *storeID, *storeID)
	}

	if filter.StartDate != nil {
		b.Add("it.created_at >= $%d", *filter.StartDate)
	}
	if filter.EndDate != nil {
		b.Add("it.created_at <= $%d", *filter.EndDate)
	}
	if filter.TransactionType != nil && *filter.TransactionType != "" {
		b.Add("it.transaction_type = $%d", *filter.TransactionType)
	}
	if filter.EmployeeId != nil {
		b.Add("it.employee_id = $%d", *filter.EmployeeId)
	}

	whereClause := b.WhereClause()
	countQuery := `SELECT COUNT(*) FROM inventory_transactions it ` + whereClause
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, b.Args()...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	sortOrder := "DESC"
	if filter.SortOrder == "ASC" {
		sortOrder = "ASC"
	}

	paginateClause := b.Paginate(limit, offset)

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
		ORDER BY it.created_at %s %s`, whereClause, sortOrder, paginateClause)

	rows, err := r.db.QueryContext(ctx, dataQuery, b.Args()...)
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
