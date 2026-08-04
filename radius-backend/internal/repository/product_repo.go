//radius-backend/internal/repository/product_repo.go
package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
)

type ProductRepo struct {
	db *sql.DB
}

func NewProductRepo(db *sql.DB) *ProductRepo {
	return &ProductRepo{db: db}
}

func (r *ProductRepo) GetProductByID(ctx context.Context, id int) (*models.Product, error) {
	query := `
		SELECT product_id, sku, upc, name, description, category_id, brand, unit_of_measure, units_per_case, weight, is_active, created_at
		FROM products
		WHERE product_id = $1
	`
	var p models.Product
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ProductId, &p.Sku, &p.Upc, &p.Name, &p.Description,
		&p.CategoryId, &p.Brand, &p.UnitOfMeasure, &p.UnitsPerCase,
		&p.Weight, &p.IsActive, &p.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Not found
		}
		return nil, err
	}
	return &p, nil
}
