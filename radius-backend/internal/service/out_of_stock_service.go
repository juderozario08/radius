// radius-backend/internal/service/out_of_stock_service.go
package service

type OutOfStockService struct {
	productsRepo  ProductRepository
	inventoryRepo InventoryRepository
	sessionRepo   SessionRepository
	employeeRepo  EmployeeRepository
	storeRepo     StoreRepository
}

func NewOutOfStockService(
	productsRepo ProductRepository,
	inventoryRepo InventoryRepository,
	sessionRepo SessionRepository,
	employeeRepo EmployeeRepository,
	storeRepo StoreRepository,
) *OutOfStockService {
	return &OutOfStockService{
		productsRepo:  productsRepo,
		inventoryRepo: inventoryRepo,
		sessionRepo:   sessionRepo,
		employeeRepo:  employeeRepo,
		storeRepo:     storeRepo,
	}
}
