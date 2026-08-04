// radius-backend/internal/service/cycle_count_service.go
package service

type CycleCountService struct {
	storeRepo     StoreRepository
	employeeRepo  EmployeeRepository
	sessionRepo   SessionRepository
	inventoryRepo InventoryRepository
	productsRepo  ProductRepository
}

func NewCycleCountService(
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
	inventoryRepo InventoryRepository,
	productsRepo ProductRepository,
) *CycleCountService {
	return &CycleCountService{
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
		inventoryRepo: inventoryRepo,
		productsRepo:  productsRepo,
	}
}
