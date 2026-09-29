package repository

import (
	"context"
	"database/sql"
	"fmt"
	"radius/internal/models"
	"radius/internal/util/queryutil"
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
	var conditions []string
	var args []interface{}

	if query != "" {
		conditions, args = queryutil.AppendCondition(conditions, args, fmt.Sprintf("(name ILIKE $%d OR sku ILIKE $%d OR COALESCE(description, '') ILIKE $%d)", len(args)+1, len(args)+1, len(args)+1), "%"+query+"%")
	}

	if categoryID != nil {
		conditions, args = queryutil.AppendCondition(conditions, args, fmt.Sprintf("category_id = $%d", len(args)+1), *categoryID)
	}

	if brand != nil && *brand != "" {
		conditions, args = queryutil.AppendCondition(conditions, args, fmt.Sprintf("brand ILIKE $%d", len(args)+1), "%"+*brand+"%")
	}

	if isActive != nil {
		conditions, args = queryutil.AppendCondition(conditions, args, fmt.Sprintf("is_active = $%d", len(args)+1), *isActive)
	}

	if unitOfMeasure != nil && *unitOfMeasure != "" {
		conditions, args = queryutil.AppendCondition(conditions, args, fmt.Sprintf("unit_of_measure = $%d", len(args)+1), *unitOfMeasure)
	}

	whereClause := queryutil.BuildWhereClause(conditions)
	countQuery := "SELECT COUNT(*) FROM products " + whereClause

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	baseDataQuery := fmt.Sprintf(
		`SELECT product_id, sku, upc, name, description, category_id, brand, unit_of_measure, units_per_case, weight, is_active, created_at
		FROM products %s
		ORDER BY name ASC`,
		whereClause,
	)

	dataQuery, paginatedArgs := queryutil.PaginateQuery(baseDataQuery, limit, offset, len(args)+1)
	args = append(args, paginatedArgs...)

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
