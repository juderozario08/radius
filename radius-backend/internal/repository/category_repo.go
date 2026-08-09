// radius-backend/internal/repository/category_repo.go
package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
)

type CategoryRepo struct {
	db *sql.DB
}

func NewCategoryRepo(db *sql.DB) *CategoryRepo {
	return &CategoryRepo{db: db}
}

func (r *CategoryRepo) GetAllCategories(ctx context.Context) ([]models.Category, error) {
	query := `SELECT category_id, parent_id, name FROM categories ORDER BY name ASC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.CategoryId, &c.ParentId, &c.Name); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}

	return categories, rows.Err()
}

func (r *CategoryRepo) GetDistinctBrands(ctx context.Context) ([]string, error) {
	query := `SELECT DISTINCT brand FROM products WHERE brand != '' ORDER BY brand ASC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var brands []string
	for rows.Next() {
		var b string
		if err := rows.Scan(&b); err != nil {
			return nil, err
		}
		brands = append(brands, b)
	}

	return brands, rows.Err()
}
