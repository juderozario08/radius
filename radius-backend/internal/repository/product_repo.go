package repository

import (
	"context"
	"database/sql"
	"fmt"
	"radius/internal/models"
	"radius/internal/util/queryutil"
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
		SELECT product_id, sku, upc, name, description, COALESCE(category_id, 0), brand, unit_of_measure, units_per_case, weight, is_active,
		       COALESCE(is_returnable, TRUE), COALESCE(retail_price, 0), created_at
		FROM products
		WHERE product_id = $1
	`
	var p models.Product
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ProductId, &p.Sku, &p.Upc, &p.Name, &p.Description,
		&p.CategoryId, &p.Brand, &p.UnitOfMeasure, &p.UnitsPerCase,
		&p.Weight, &p.IsActive, &p.IsReturnable, &p.RetailPrice, &p.CreatedAt,
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
	query = strings.TrimSpace(query)
	if len(query) > 100 {
		query = query[:100]
	}

	b := queryutil.NewBuilder()

	if query != "" {
		b.AddWithSameArg("(name ILIKE $%d OR sku ILIKE $%d OR COALESCE(description, '') ILIKE $%d)", "%"+query+"%")
	}

	if categoryID != nil {
		b.Add("category_id = $%d", *categoryID)
	}

	if brand != nil && *brand != "" {
		b.Add("brand ILIKE $%d", "%"+*brand+"%")
	}

	if isActive != nil {
		b.Add("is_active = $%d", *isActive)
	}

	if unitOfMeasure != nil && *unitOfMeasure != "" {
		b.Add("unit_of_measure = $%d", *unitOfMeasure)
	}

	whereClause := b.WhereClause()
	countQuery := "SELECT COUNT(*) FROM products " + whereClause

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, b.Args()...).Scan(&total); err != nil {
		return nil, 0, err
	}

	paginateClause := b.Paginate(limit, offset)

	dataQuery := fmt.Sprintf(
		`SELECT product_id, sku, upc, name, description, category_id, brand, unit_of_measure, units_per_case, weight, is_active, created_at
		FROM products %s
		ORDER BY name ASC, product_id ASC
		%s`,
		whereClause, paginateClause,
	)

	rows, err := r.db.QueryContext(ctx, dataQuery, b.Args()...)
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
