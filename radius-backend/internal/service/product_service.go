// radius-backend/internal/service/product_service.go
package service

import (
	"context"
	"radius/internal/models"
)

type ProductService struct {
	productsRepo ProductRepository
	storeRepo    StoreRepository
	employeeRepo EmployeeRepository
	sessionRepo  SessionRepository
}

func NewProductService(
	productsRepo ProductRepository,
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
) *ProductService {
	return &ProductService{
		productsRepo: productsRepo,
		storeRepo:    storeRepo,
		employeeRepo: employeeRepo,
		sessionRepo:  sessionRepo,
	}
}

func (s *ProductService) GetProductByID(ctx context.Context, id int) (*models.Product, error) {
	return s.productsRepo.GetProductByID(ctx, id)
}

func (s *ProductService) SearchProducts(
	ctx context.Context,
	query string,
	categoryID *int,
	brand *string,
	isActive *bool,
	unitOfMeasure *string,
	limit, offset int,
) ([]models.Product, int, error) {
	return s.productsRepo.SearchProducts(ctx, query, categoryID, brand, isActive, unitOfMeasure, limit, offset)
}
