package repository

import (
	"context"
	"database/sql"
	"fmt"
	"radius/internal/models"
	"strings"
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
			return nil, nil
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
			return nil, nil
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

	query = strings.TrimSpace(query)
	if len(query) > 100 {
		query = query[:100]
	}

	if query != "" {
		baseWhere += fmt.Sprintf(
			" AND (name ILIKE $%d OR sku ILIKE $%d OR description ILIKE $%d)",
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

	countQuery := "SELECT COUNT(*) FROM products " + baseWhere
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf(
		`SELECT product_id, sku, upc, name, description, category_id, brand, unit_of_measure, units_per_case, weight, is_active, created_at
		FROM products %s
		ORDER BY name ASC, product_id ASC
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

func (r *ProductRepo) UpdateProduct(ctx context.Context, product *models.Product) error {
	query := `
		UPDATE products
		SET sku = $1, upc = $2, name = $3, description = $4, category_id = $5,
		    brand = $6, unit_of_measure = $7, units_per_case = $8, weight = $9,
		    is_active = $10, is_returnable = $11, warranty_days = $12, retail_price = $13
		WHERE product_id = $14
	`
	_, err := r.db.ExecContext(ctx, query,
		product.Sku, product.Upc, product.Name, product.Description, product.CategoryId,
		product.Brand, product.UnitOfMeasure, product.UnitsPerCase, product.Weight,
		product.IsActive, product.IsReturnable, product.WarrantyDays, product.RetailPrice,
		product.ProductId,
	)
	return err
}
