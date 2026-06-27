package service

import "radius/internal/repository"

type OutOfStockService struct {
	productsRepo  *repository.ProductRepo
	inventoryRepo *repository.InventoryRepo
	sessionRepo   *repository.SessionRepo
	employeeRepo  *repository.EmployeeRepo
	storeRepo     *repository.StoreRepo
}

func NewOutOfStockService(
	productsRepo *repository.ProductRepo,
	inventoryRepo *repository.InventoryRepo,
	sessionRepo *repository.SessionRepo,
	employeeRepo *repository.EmployeeRepo,
	storeRepo *repository.StoreRepo,
) *OutOfStockService {
	return &OutOfStockService{
		productsRepo:  productsRepo,
		inventoryRepo: inventoryRepo,
		sessionRepo:   sessionRepo,
		employeeRepo:  employeeRepo,
		storeRepo:     storeRepo,
	}
}
