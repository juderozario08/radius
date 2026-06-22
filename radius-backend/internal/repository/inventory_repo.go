package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
)

type InventoryRepo struct {
	db *sql.DB
}

func GetInventoryRepo(db *sql.DB) *InventoryRepo {
	return &InventoryRepo{db: db}
}

func (db *InventoryRepo) GetProductBySku(ctx context.Context, sku int) (*models.Employee, error) {
	return nil, nil
}

func (db *InventoryRepo) GetProductByUpc(ctx context.Context, upc string) (*models.Employee, error) {
	return nil, nil
}

func (db *InventoryRepo) CreateInventoryItem(ctx context.Context, model models.Inventory) (*models.Employee, error) {
	return nil, nil
}

func (db *InventoryRepo) DeleteProductBySku(ctx context.Context, sku int) (*models.Employee, error) {
	return nil, nil
}
