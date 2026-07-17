//radius-backend/internal/service/store_service.go
package service

import "radius/internal/repository"

type StoreService struct {
	storeRepo    *repository.StoreRepo
	employeeRepo *repository.EmployeeRepo
	productsRepo *repository.ProductRepo
}

func NewStoreService(
	storeRepo *repository.StoreRepo,
	employeeRepo *repository.EmployeeRepo,
	productsRepo *repository.ProductRepo,
) *StoreService {
	return &StoreService{
		storeRepo:    storeRepo,
		employeeRepo: employeeRepo,
		productsRepo: productsRepo,
	}
}
