// radius-backend/internal/service/product_service.go
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"radius/internal/models"
	"time"

	"github.com/redis/go-redis/v9"
)

type ProductService struct {
	productsRepo ProductRepository
	storeRepo    StoreRepository
	employeeRepo EmployeeRepository
	sessionRepo  SessionRepository
	redisClient  *redis.Client
}

func NewProductService(
	productsRepo ProductRepository,
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
	redisClient *redis.Client,
) *ProductService {
	return &ProductService{
		productsRepo: productsRepo,
		storeRepo:    storeRepo,
		employeeRepo: employeeRepo,
		sessionRepo:  sessionRepo,
		redisClient:  redisClient,
	}
}

func (s *ProductService) GetProductByID(ctx context.Context, id int) (*models.Product, error) {
	cacheKey := fmt.Sprintf("product:%d", id)
	val, err := s.redisClient.Get(ctx, cacheKey).Result()
	if err == nil {
		var product models.Product
		if err := json.Unmarshal([]byte(val), &product); err == nil {
			return &product, nil
		}
	}

	product, err := s.productsRepo.GetProductByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if product != nil {
		productJSON, err := json.Marshal(product)
		if err == nil {
			s.redisClient.Set(ctx, cacheKey, productJSON, 5*time.Minute)
		} else {
			log.Printf("Failed to marshal product for cache: %v", err)
		}
	}

	return product, nil
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
