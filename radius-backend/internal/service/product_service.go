package service

import (
	"context"
	"encoding/json"
	"fmt"
	"radius/internal/models"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

type ProductService struct {
	productsRepo ProductRepository
	storeRepo    StoreRepository
	employeeRepo EmployeeRepository
	sessionRepo  SessionRepository
	redisClient  *redis.Client
	requestGroup singleflight.Group
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

	v, err, _ := s.requestGroup.Do(cacheKey, func() (any, error) {
		prod, dbErr := s.productsRepo.GetProductByID(ctx, id)
		if dbErr != nil {
			return nil, dbErr
		}
		if prod != nil {
			if data, marshalErr := json.Marshal(prod); marshalErr == nil {
				s.redisClient.Set(ctx, cacheKey, data, 5*time.Minute)
			}
		}
		return prod, nil
	})

	if err != nil {
		return nil, err
	}
	if v == nil {
		return nil, nil
	}
	return v.(*models.Product), nil
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
