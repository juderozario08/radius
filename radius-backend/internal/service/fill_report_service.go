package service

import (
	"context"
	"radius/internal/models"
)

type FillReportService struct {
	storeRepo     StoreRepository
	employeeRepo  EmployeeRepository
	sessionRepo   SessionRepository
	inventoryRepo InventoryRepository
	productsRepo  ProductRepository
}

func NewFillReportService(
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
	inventoryRepo InventoryRepository,
	productsRepo ProductRepository,
) *FillReportService {
	return &FillReportService{
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
		inventoryRepo: inventoryRepo,
		productsRepo:  productsRepo,
	}
}

func (s *FillReportService) GetStoreFillReport(ctx context.Context, storeID int, userRole models.EmployeeRole, userStoreId int) (*models.FillReport, []models.FillReportItemDetail, error) {
	return nil, nil, nil
}

func (s *FillReportService) LogEmptyHole(ctx context.Context, storeID int, productID int, employeeID int) error {
	return nil
}
