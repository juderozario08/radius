package repository

import (
	"context"
	"database/sql"
	"fmt"
	"radius/internal/models"
	"strings"
)

type FillReportRepository struct {
	db *sql.DB
}

func NewFillReportRepository(db *sql.DB) *FillReportRepository {
	return &FillReportRepository{db: db}
}

func (r *FillReportRepository) GetOrCreateActiveReport(ctx context.Context, storeID int, employeeID *int) (*models.FillReport, error) {
	var report models.FillReport
	query := `
		SELECT fill_report_id, store_id, report_date, generated_by, status, created_at
		FROM fill_reports
		WHERE store_id = $1 AND status = 'OPEN'
		ORDER BY created_at DESC
		LIMIT 1
	`
	err := r.db.QueryRowContext(ctx, query, storeID).Scan(
		&report.FillReportId,
		&report.StoreId,
		&report.ReportDate,
		&report.GeneratedBy,
		&report.Status,
		&report.CreatedAt,
	)

	if err == nil {
		return &report, nil
	}

	if err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to query active fill report: %w", err)
	}

	// Create a new OPEN fill report for this store
	insertQuery := `
		INSERT INTO fill_reports (store_id, report_date, generated_by, status)
		VALUES ($1, CURRENT_DATE, $2, 'OPEN')
		RETURNING fill_report_id, store_id, report_date, generated_by, status, created_at
	`
	err = r.db.QueryRowContext(ctx, insertQuery, storeID, employeeID).Scan(
		&report.FillReportId,
		&report.StoreId,
		&report.ReportDate,
		&report.GeneratedBy,
		&report.Status,
		&report.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create active fill report: %w", err)
	}

	return &report, nil
}

func (r *FillReportRepository) GetActiveFillReportForStore(ctx context.Context, storeID int, filter models.FillReportFilter) (*models.FillReport, []models.FillReportItemDetail, error) {
	report, err := r.GetOrCreateActiveReport(ctx, storeID, nil)
	if err != nil {
		return nil, nil, err
	}

	baseQuery := `
		SELECT 
			fri.fill_item_id,
			fri.fill_report_id,
			fri.product_id,
			p.name AS product_name,
			p.sku AS product_sku,
			p.upc AS product_upc,
			p.brand AS product_brand,
			p.category_id,
			c.name AS category_name,
			i.aisle,
			i.mims_location_id,
			COALESCE(i.on_hand_qty, 0) AS on_hand_qty,
			COALESCE(i.available_qty, 0) AS available_qty,
			fri.fill_qty,
			fri.completed,
			fri.completed_at,
			fri.is_empty_hole,
			COALESCE(fri.created_at, NOW()) AS created_at,
			fri.updated_at
		FROM fill_report_items fri
		JOIN products p ON fri.product_id = p.product_id
		LEFT JOIN categories c ON p.category_id = c.category_id
		LEFT JOIN inventory i ON fri.product_id = i.product_id AND i.store_id = $1
		WHERE fri.fill_report_id = $2
	`

	args := []any{storeID, report.FillReportId}
	conditions := []string{}

	if strings.TrimSpace(filter.Query) != "" {
		q := "%" + strings.TrimSpace(filter.Query) + "%"
		args = append(args, q)
		conditions = append(conditions, fmt.Sprintf("(p.name ILIKE $%d OR p.sku ILIKE $%d OR p.upc ILIKE $%d OR p.brand ILIKE $%d)", len(args), len(args), len(args), len(args)))
	}

	switch strings.ToUpper(strings.TrimSpace(filter.FilterType)) {
	case "TRANSACTIONS":
		conditions = append(conditions, "fri.is_empty_hole = FALSE")
	case "IS4TC":
		conditions = append(conditions, "fri.is_empty_hole = TRUE")
	case "NEGATIVE":
		conditions = append(conditions, "COALESCE(i.on_hand_qty, 0) < 0")
	case "IN_STOCK":
		conditions = append(conditions, "COALESCE(i.on_hand_qty, 0) > 0")
	}

	for _, cond := range conditions {
		baseQuery += " AND " + cond
	}

	// Sorting
	sortOrder := "ASC"
	if strings.ToUpper(strings.TrimSpace(filter.SortOrder)) == "DESC" {
		sortOrder = "DESC"
	}

	var orderBy string
	switch strings.ToLower(strings.TrimSpace(filter.SortBy)) {
	case "aisle":
		if sortOrder == "DESC" {
			orderBy = "ORDER BY i.aisle DESC NULLS LAST, p.name ASC"
		} else {
			orderBy = "ORDER BY i.aisle ASC NULLS LAST, p.name ASC"
		}
	case "location":
		if sortOrder == "DESC" {
			orderBy = "ORDER BY i.mims_location_id DESC NULLS LAST, p.name ASC"
		} else {
			orderBy = "ORDER BY i.mims_location_id ASC NULLS LAST, p.name ASC"
		}
	case "category":
		orderBy = fmt.Sprintf("ORDER BY c.name %s NULLS LAST, p.name ASC", sortOrder)
	case "name":
		orderBy = fmt.Sprintf("ORDER BY p.name %s", sortOrder)
	case "fill_qty":
		orderBy = fmt.Sprintf("ORDER BY fri.fill_qty %s, p.name ASC", sortOrder)
	case "on_hand_qty":
		orderBy = fmt.Sprintf("ORDER BY i.on_hand_qty %s, p.name ASC", sortOrder)
	default:
		// Default optimization: Aisle first (NULLS LAST), then newly created items
		orderBy = "ORDER BY i.aisle ASC NULLS LAST, fri.created_at DESC, p.name ASC"
	}

	fullQuery := baseQuery + " " + orderBy

	rows, err := r.db.QueryContext(ctx, fullQuery, args...)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to query fill report items: %w", err)
	}
	defer rows.Close()

	items := []models.FillReportItemDetail{}
	for rows.Next() {
		var item models.FillReportItemDetail
		var categoryName sql.NullString
		var categoryId sql.NullInt64
		var aisle sql.NullString
		var mimsLocationId sql.NullString
		var completedAt sql.NullTime
		var updatedAt sql.NullTime

		err := rows.Scan(
			&item.FillItemId,
			&item.FillReportId,
			&item.ProductId,
			&item.ProductName,
			&item.ProductSku,
			&item.ProductUpc,
			&item.Brand,
			&categoryId,
			&categoryName,
			&aisle,
			&mimsLocationId,
			&item.OnHandQty,
			&item.AvailableQty,
			&item.FillQty,
			&item.Completed,
			&completedAt,
			&item.IsEmptyHole,
			&item.CreatedAt,
			&updatedAt,
		)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to scan fill report item: %w", err)
		}

		if categoryId.Valid {
			cid := int(categoryId.Int64)
			item.CategoryId = &cid
		}
		if categoryName.Valid {
			cname := categoryName.String
			item.CategoryName = &cname
		}
		if aisle.Valid && strings.TrimSpace(aisle.String) != "" {
			a := aisle.String
			item.Aisle = &a
		}
		if mimsLocationId.Valid && strings.TrimSpace(mimsLocationId.String) != "" {
			loc := mimsLocationId.String
			item.MimsLocationId = &loc
		}
		if completedAt.Valid {
			item.CompletedAt = &completedAt.Time
		}
		if updatedAt.Valid {
			item.UpdatedAt = &updatedAt.Time
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, nil, fmt.Errorf("row error in fill report items: %w", err)
	}

	return report, items, nil
}

func (r *FillReportRepository) AddEmptyHole(ctx context.Context, storeID int, productID int, employeeID *int) error {
	report, err := r.GetOrCreateActiveReport(ctx, storeID, employeeID)
	if err != nil {
		return err
	}

	upsertQuery := `
		INSERT INTO fill_report_items (fill_report_id, product_id, fill_qty, is_empty_hole, created_at, updated_at)
		VALUES ($1, $2, 0, TRUE, NOW(), NOW())
		ON CONFLICT (fill_report_id, product_id)
		DO UPDATE SET is_empty_hole = TRUE, updated_at = NOW()
	`

	_, err = r.db.ExecContext(ctx, upsertQuery, report.FillReportId, productID)
	if err != nil {
		return fmt.Errorf("failed to add empty hole to fill report: %w", err)
	}

	return nil
}

func (r *FillReportRepository) AddSoldItems(ctx context.Context, storeID int, items []models.TransactionItem) error {
	if len(items) == 0 {
		return nil
	}

	report, err := r.GetOrCreateActiveReport(ctx, storeID, nil)
	if err != nil {
		return err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	upsertStmt, err := tx.PrepareContext(ctx, `
		INSERT INTO fill_report_items (fill_report_id, product_id, fill_qty, is_empty_hole, created_at, updated_at)
		VALUES ($1, $2, $3, FALSE, NOW(), NOW())
		ON CONFLICT (fill_report_id, product_id)
		DO UPDATE SET fill_qty = fill_report_items.fill_qty + EXCLUDED.fill_qty, updated_at = NOW()
	`)
	if err != nil {
		return err
	}
	defer upsertStmt.Close()

	for _, item := range items {
		if item.Quantity <= 0 {
			continue
		}
		_, err := upsertStmt.ExecContext(ctx, report.FillReportId, item.ProductId, item.Quantity)
		if err != nil {
			return fmt.Errorf("failed to upsert sold item into fill report: %w", err)
		}
	}

	return tx.Commit()
}
