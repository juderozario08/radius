// radius-backend/internal/repository/inventory_repo.go
package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
)

type InventoryRepo struct {
	db *sql.DB
}

func NewInventoryRepo(db *sql.DB) *InventoryRepo {
	return &InventoryRepo{db: db}
}

func (r *InventoryRepo) GetProductBySku(ctx context.Context, sku int) (*models.Product, error) {
	return nil, nil
}

func (r *InventoryRepo) GetProductByUpc(ctx context.Context, upc string) (*models.Product, error) {
	return nil, nil
}

func (r *InventoryRepo) CreateInventoryItem(ctx context.Context, model models.Inventory) (*models.Inventory, error) {
	return nil, nil
}

func (r *InventoryRepo) DeleteProductBySku(ctx context.Context, sku int) (*models.Product, error) {
	return nil, nil
}
