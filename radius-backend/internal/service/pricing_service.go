package service

import "radius/internal/repository"

type PricingService struct {
	storeRepo     *repository.StoreRepo
	employeeRepo  *repository.EmployeeRepo
	sessionRepo   *repository.SessionRepo
	inventoryRepo *repository.InventoryRepo
}

func NewPricingService(
	storeRepo *repository.StoreRepo,
	employeeRepo *repository.EmployeeRepo,
	sessionRepo *repository.SessionRepo,
	inventoryRepo *repository.InventoryRepo,
) *PricingService {
	return &PricingService{
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
		inventoryRepo: inventoryRepo,
	}
}
