//radius-backend/internal/service/transfer_service.go
package service

import "radius/internal/repository"

type TransferService struct {
	storeRepo     *repository.StoreRepo
	inventoryRepo *repository.InventoryRepo
	employeeRepo  *repository.EmployeeRepo
	sessionRepo   *repository.SessionRepo
}

func NewTransferService(
	storeRepo *repository.StoreRepo,
	inventoryRepo *repository.InventoryRepo,
	employeeRepo *repository.EmployeeRepo,
	sessionRepo *repository.SessionRepo,
) *TransferService {
	return &TransferService{
		storeRepo:     storeRepo,
		inventoryRepo: inventoryRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
	}
}
