// radius-backend/internal/service/pricing_service.go
package service

type PricingService struct {
	storeRepo     StoreRepository
	employeeRepo  EmployeeRepository
	sessionRepo   SessionRepository
	inventoryRepo InventoryRepository
}

func NewPricingService(
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
	inventoryRepo InventoryRepository,
) *PricingService {
	return &PricingService{
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
		inventoryRepo: inventoryRepo,
	}
}
