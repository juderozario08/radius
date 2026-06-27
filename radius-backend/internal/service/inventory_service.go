package service

import "radius/internal/repository"

type InventoryService struct {
	storeRepo     *repository.StoreRepo
	employeeRepo  *repository.EmployeeRepo
	sessionRepo   *repository.SessionRepo
	inventoryRepo *repository.InventoryRepo
	productsRepo  *repository.ProductRepo
}

func NewInventoryService(
	storeRepo *repository.StoreRepo,
	employeeRepo *repository.EmployeeRepo,
	sessionRepo *repository.SessionRepo,
	inventoryRepo *repository.InventoryRepo,
	productsRepo *repository.ProductRepo,
) *InventoryService {
	return &InventoryService{
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
		inventoryRepo: inventoryRepo,
		productsRepo:  productsRepo,
	}
}
