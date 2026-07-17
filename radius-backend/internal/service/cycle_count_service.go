//radius-backend/internal/service/cycle_count_service.go
package service

import "radius/internal/repository"

type CycleCountService struct {
	storeRepo     *repository.StoreRepo
	employeeRepo  *repository.EmployeeRepo
	sessionRepo   *repository.SessionRepo
	inventoryRepo *repository.InventoryRepo
	productsRepo  *repository.ProductRepo
}

func NewCycleCountService(
	storeRepo *repository.StoreRepo,
	employeeRepo *repository.EmployeeRepo,
	sessionRepo *repository.SessionRepo,
	inventoryRepo *repository.InventoryRepo,
	productsRepo *repository.ProductRepo,
) *CycleCountService {
	return &CycleCountService{
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
		inventoryRepo: inventoryRepo,
		productsRepo:  productsRepo,
	}
}
