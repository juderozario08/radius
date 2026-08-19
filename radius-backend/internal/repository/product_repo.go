//radius-backend/internal/repository/product_repo.go
package repository

import (
	"context"
	"database/sql"
	"fmt"
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

func (r *ProductRepo) GetProductByBarcode(ctx context.Context, barcode string) (*models.Product, error) {
	query := `
		SELECT product_id, sku, upc, name, description, category_id, brand, unit_of_measure, units_per_case, weight, is_active, created_at
		FROM products
		WHERE sku = $1 OR upc = $1
		LIMIT 1
	`
	var p models.Product
	err := r.db.QueryRowContext(ctx, query, barcode).Scan(
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

func (r *ProductRepo) SearchProducts(
	ctx context.Context,
	query string,
	categoryID *int,
	brand *string,
	isActive *bool,
	unitOfMeasure *string,
	limit, offset int,
) ([]models.Product, int, error) {
	baseWhere := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if query != "" {
		baseWhere += fmt.Sprintf(
			" AND (name ILIKE $%d OR sku ILIKE $%d OR COALESCE(description, '') ILIKE $%d)",
			argIdx, argIdx, argIdx,
		)
		args = append(args, "%"+query+"%")
		argIdx++
	}

	if categoryID != nil {
		baseWhere += fmt.Sprintf(" AND category_id = $%d", argIdx)
		args = append(args, *categoryID)
		argIdx++
	}

	if brand != nil && *brand != "" {
		baseWhere += fmt.Sprintf(" AND brand ILIKE $%d", argIdx)
		args = append(args, "%"+*brand+"%")
		argIdx++
	}

	if isActive != nil {
		baseWhere += fmt.Sprintf(" AND is_active = $%d", argIdx)
		args = append(args, *isActive)
		argIdx++
	}

	if unitOfMeasure != nil && *unitOfMeasure != "" {
		baseWhere += fmt.Sprintf(" AND unit_of_measure = $%d", argIdx)
		args = append(args, *unitOfMeasure)
		argIdx++
	}

	// Count query
	countQuery := "SELECT COUNT(*) FROM products " + baseWhere
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data query
	dataQuery := fmt.Sprintf(
		`SELECT product_id, sku, upc, name, description, category_id, brand, unit_of_measure, units_per_case, weight, is_active, created_at
		FROM products %s
		ORDER BY name ASC
		LIMIT $%d OFFSET $%d`,
		baseWhere, argIdx, argIdx+1,
	)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(
			&p.ProductId, &p.Sku, &p.Upc, &p.Name, &p.Description,
			&p.CategoryId, &p.Brand, &p.UnitOfMeasure, &p.UnitsPerCase,
			&p.Weight, &p.IsActive, &p.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		products = append(products, p)
	}

	return products, total, rows.Err()
}
