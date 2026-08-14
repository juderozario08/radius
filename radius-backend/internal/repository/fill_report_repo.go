package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
)

type FillReportRepository struct {
	db *sql.DB
}

func NewFillReportRepository(db *sql.DB) *FillReportRepository {
	return &FillReportRepository{db: db}
}

func (r *FillReportRepository) GetActiveFillReportForStore(ctx context.Context, storeID int) (*models.FillReport, []models.FillReportItemDetail, error) {
	// Simple mock implementation for scaffolding
	return nil, nil, nil
}

func (r *FillReportRepository) AddEmptyHole(ctx context.Context, storeID int, productID int, employeeID int) error {
	// Mock
	return nil
}

func (r *FillReportRepository) AddSoldItems(ctx context.Context, storeID int, items []models.TransactionItem) error {
	// Mock
	return nil
}
