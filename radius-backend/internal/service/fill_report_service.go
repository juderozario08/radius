package service

import "radius/internal/repository"

type FillReportService struct {
	storeRepo     *repository.StoreRepo
	employeeRepo  *repository.EmployeeRepo
	sessionRepo   *repository.SessionRepo
	inventoryRepo *repository.InventoryRepo
	productsRepo  *repository.ProductRepo
}

func NewFillReportService(
	storeRepo *repository.StoreRepo,
	employeeRepo *repository.EmployeeRepo,
	sessionRepo *repository.SessionRepo,
	inventoryRepo *repository.InventoryRepo,
	productsRepo *repository.ProductRepo,
) *FillReportService {
	return &FillReportService{
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
		inventoryRepo: inventoryRepo,
		productsRepo:  productsRepo,
	}
}
