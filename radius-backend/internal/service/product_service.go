//radius-backend/internal/service/product_service.go
package service

import "radius/internal/repository"

type ProductService struct {
	productsRepo *repository.ProductRepo
	storeRepo    *repository.StoreRepo
	employeeRepo *repository.EmployeeRepo
	sessionRepo  *repository.SessionRepo
}

func NewProductService(
	productsRepo *repository.ProductRepo,
	storeRepo *repository.StoreRepo,
	employeeRepo *repository.EmployeeRepo,
	sessionRepo *repository.SessionRepo,
) *ProductService {
	return &ProductService{
		productsRepo: productsRepo,
		storeRepo:    storeRepo,
		employeeRepo: employeeRepo,
		sessionRepo:  sessionRepo,
	}
}
