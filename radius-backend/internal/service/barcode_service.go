package service

import "radius/internal/repository"

type BarcodeService struct {
	storeRepo     *repository.StoreRepo
	employeeRepo  *repository.EmployeeRepo
	sessionRepo   *repository.SessionRepo
	inventoryRepo *repository.InventoryRepo
	productsRepo  *repository.ProductRepo
}

func NewBarcodeService(
	storeRepo *repository.StoreRepo,
	employeeRepo *repository.EmployeeRepo,
	sessionRepo *repository.SessionRepo,
	inventoryRepo *repository.InventoryRepo,
	productsRepo *repository.ProductRepo,
) *BarcodeService {
	return &BarcodeService{
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
		inventoryRepo: inventoryRepo,
		productsRepo:  productsRepo,
	}
}
