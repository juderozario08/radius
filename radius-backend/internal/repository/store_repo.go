package repository

import (
	"context"
	"database/sql"
	"errors"
	"radius/internal/models"
)

type StoreRepo struct {
	db *sql.DB
}

func NewStoreRepo(db *sql.DB) *StoreRepo {
	return &StoreRepo{db: db}
}

func (r *StoreRepo) GetAllStores(ctx context.Context, pageSize int, pageNumber int) ([]models.Store, int, error) {
	var totalCount int
	countQuery := `SELECT COUNT(*) FROM stores;`

	err := r.db.QueryRowContext(ctx, countQuery).Scan(&totalCount)
	if err != nil {
		return nil, -1, err
	}

	offset := pageNumber * pageSize
	query := `
		SELECT
			store_id,
			name,
			address,
			city,
			province,
			postal_code,
			phone,
			timezone,
			is_active,
			created_at
		FROM stores
		ORDER BY store_id ASC
		LIMIT $1 OFFSET $2;
	`

	rows, err := r.db.QueryContext(ctx, query, pageSize, offset)
	if err != nil {
		return nil, -1, err
	}
	defer rows.Close()

	var stores []models.Store
	for rows.Next() {
		var s models.Store
		err := rows.Scan(
			&s.StoreId,
			&s.Name,
			&s.Address,
			&s.City,
			&s.Province,
			&s.PostalCode,
			&s.Phone,
			&s.Timezone,
			&s.IsActive,
			&s.CreatedAt,
		)
		if err != nil {
			return nil, -1, err
		}
		stores = append(stores, s)
	}

	if err = rows.Err(); err != nil {
		return nil, -1, err
	}

	return stores, totalCount, nil
}

func (r *StoreRepo) UpdateStore(ctx context.Context, body models.UpdateStoreRequest) error {
	query := `
        UPDATE stores SET
            name = $1,
            address = $2,
            city = $3,
            province = $4,
            postal_code = $5,
            phone = $6,
            timezone = $7,
            is_active = $8
        WHERE store_id = $9
	`
	res, err := r.db.ExecContext(
		ctx, query,
		body.Name, body.Address, body.City, body.Province,
		body.PostalCode, body.Phone, body.Timezone, body.IsActive,
		body.StoreId,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("No store found with the provided ID")
	}
	return nil
}

func (r *StoreRepo) CreateStore(ctx context.Context, body models.CreateStoreRequest) (*models.Store, error) {
	query := `
		INSERT INTO stores (name, address, city, province, postal_code, phone, timezone, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING store_id, name, address, city, province, postal_code, phone, timezone, is_active, created_at;
	`
	var store models.Store
	err := r.db.QueryRowContext(
		ctx, query, body.Name, body.Address, body.City,
		body.Province, body.PostalCode, body.Phone, body.Timezone, body.IsActive,
	).Scan(
		&store.StoreId,
		&store.Name,
		&store.Address,
		&store.City,
		&store.Province,
		&store.PostalCode,
		&store.Phone,
		&store.Timezone,
		&store.IsActive,
		&store.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &store, nil
}

func (r *StoreRepo) ActivateStore(ctx context.Context, storeId int) error {
	query := `UPDATE stores SET is_active = TRUE WHERE store_id = $1;`
	_, err := r.db.ExecContext(ctx, query, storeId)
	return err
}

func (r *StoreRepo) DeactivateStore(ctx context.Context, storeId int) error {
	query := `UPDATE stores SET is_active = FALSE WHERE store_id = $1;`
	_, err := r.db.ExecContext(ctx, query, storeId)
	return err
}

func (r *StoreRepo) GetStore(ctx context.Context, storeId int) (*models.Store, error) {
	query := `
		SELECT
			store_id,
			name,
			address,
			city,
			province,
			postal_code,
			phone,
			timezone,
			is_active,
			created_at
		FROM stores
		WHERE store_id = $1
	`
	var store models.Store
	err := r.db.QueryRowContext(ctx, query, storeId).Scan(
		&store.StoreId,
		&store.Name,
		&store.Address,
		&store.City,
		&store.Province,
		&store.PostalCode,
		&store.Phone,
		&store.Timezone,
		&store.IsActive,
		&store.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &store, nil
}

func (r *StoreRepo) GetStoreOperationsSummaries(ctx context.Context) ([]models.StoreOperationSummary, error) {
	query := `
		SELECT
			s.store_id,
			s.name,
			s.address,
			s.city,
			s.province,
			s.is_active,
			(s.store_id = 1) AS is_head_office,
			COALESCE(ord.cnt, 0) AS active_orders_count,
			COALESCE(cc.cnt, 0) AS active_counts_count,
			COALESCE(po.cnt, 0) AS pending_pos_count
		FROM stores s
		LEFT JOIN (
			SELECT store_id, COUNT(*) AS cnt
			FROM online_orders
			WHERE (order_type = 'STS' AND status::text IN ('SHIPPED', 'DELIVERING', 'DELIVERED'))
			   OR (order_type = 'BOPIS' AND status::text IN ('WORK IN PROGRESS', 'READY FOR PICKUP', 'AWAITING PICKUP'))
			GROUP BY store_id
		) ord ON s.store_id = ord.store_id
		LEFT JOIN (
			SELECT store_id, COUNT(*) AS cnt
			FROM cycle_counts
			WHERE status::text IN ('IN PROGRESS', 'NOT STARTED', 'PENDING APPROVAL')
			GROUP BY store_id
		) cc ON s.store_id = cc.store_id
		LEFT JOIN (
			SELECT store_id, COUNT(*) AS cnt
			FROM purchase_orders
			WHERE status::text IN ('SHIPPED', 'DELIVERING', 'DELIVERED', 'PARTIAL')
			GROUP BY store_id
		) po ON s.store_id = po.store_id
		ORDER BY s.store_id ASC;
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var summaries []models.StoreOperationSummary
	for rows.Next() {
		var s models.StoreOperationSummary
		err := rows.Scan(
			&s.StoreID,
			&s.Name,
			&s.Address,
			&s.City,
			&s.Province,
			&s.IsActive,
			&s.IsHeadOffice,
			&s.ActiveOrdersCount,
			&s.ActiveCountsCount,
			&s.PendingPosCount,
		)
		if err != nil {
			return nil, err
		}
		s.HasActiveOperations = s.ActiveOrdersCount > 0 || s.ActiveCountsCount > 0 || s.PendingPosCount > 0
		summaries = append(summaries, s)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return summaries, nil
}
