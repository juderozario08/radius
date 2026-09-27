package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand/v2"
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
	if s.redisClient != nil {
		val, err := s.redisClient.Get(ctx, cacheKey).Result()
		if err == nil {
			var product models.Product
			if err := json.Unmarshal([]byte(val), &product); err == nil {
				return &product, nil
			}
		} else if !errors.Is(err, redis.Nil) {
			log.Printf("[WARN] Redis get failed for %s: %v", cacheKey, err)
		}
	}

	v, err, _ := s.requestGroup.Do(cacheKey, func() (any, error) {
		prod, dbErr := s.productsRepo.GetProductByID(ctx, id)
		if dbErr != nil {
			return nil, dbErr
		}
		if prod != nil && s.redisClient != nil {
			if data, marshalErr := json.Marshal(prod); marshalErr == nil {
				ttl := 5*time.Minute + time.Duration(rand.IntN(30))*time.Second
				if setErr := s.redisClient.Set(ctx, cacheKey, data, ttl).Err(); setErr != nil {
					log.Printf("[WARN] Redis set failed for %s: %v", cacheKey, setErr)
				}
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
