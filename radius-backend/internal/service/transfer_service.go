// radius-backend/internal/service/transfer_service.go
package service

type TransferService struct {
	storeRepo     StoreRepository
	inventoryRepo InventoryRepository
	employeeRepo  EmployeeRepository
	sessionRepo   SessionRepository
}

func NewTransferService(
	storeRepo StoreRepository,
	inventoryRepo InventoryRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
) *TransferService {
	return &TransferService{
		storeRepo:     storeRepo,
		inventoryRepo: inventoryRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
	}
}
