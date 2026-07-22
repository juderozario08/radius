// radius-backend/internal/repository/store_repo.go
package repository

import (
	"context"
	"database/sql"
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
	countQuery := `SELECT RELTUPLES::BIGINT FROM pg_class WHERE relname = 'stores';`

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
