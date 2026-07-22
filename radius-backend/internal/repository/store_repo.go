// radius-backend/internal/repository/store_repo.go
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

func (r *StoreRepo) UpdateStore(ctx context.Context, body models.Store) error {
	query := `
        UPDATE stores SET
            name = $1,
            address = $2,
            city = $3,
            province = $4,
            postal_code = $5,
            phone = $6,
            timezone = $7,
            is_active = $8,
            created_at = $9,
        WHERE store_id = $10
	`
	res, err := r.db.ExecContext(
		ctx, query,
		body.Name, body.Address, body.City, body.Province,
		body.PostalCode, body.Phone, body.Timezone, body.IsActive,
		body.CreatedAt,
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

func (r *StoreRepo) CreateStore(ctx context.Context, body models.CreateStoreRequest) error {
	query := `
		INSERT INTO stores (name, address, city, province, postal_code, phone, timezone, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
	`
	err := r.db.QueryRowContext(
		ctx, query, body.Name, body.Address, body.City,
		body.Province, body.PostalCode, body.Phone, body.Timezone, body.IsActive,
	).Scan()
	if err != nil {
		return err
	}

	return nil
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
