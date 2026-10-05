package service

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"radius/internal/cache"
	"radius/internal/database"
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

func (s *ProductService) InvalidateProductCache(ctx context.Context, id int) {
	if s.redisClient == nil {
		return
	}
	newKey := cache.CatalogProductKey(id)
	legacyKey := cache.LegacyCatalogProductKey(id)
	if err := s.redisClient.Del(ctx, newKey, legacyKey).Err(); err != nil && !errors.Is(err, redis.Nil) {
		database.CacheMetrics.RecordDeleteError()
		log.Printf("[WARN] Failed to invalidate product cache %s: %v", newKey, err)
	}
}

func (s *ProductService) GetProductByID(ctx context.Context, id int) (*models.Product, error) {
	newKey := cache.CatalogProductKey(id)
	legacyKey := cache.LegacyCatalogProductKey(id)

	if s.redisClient != nil {
		val, err := s.redisClient.Get(ctx, newKey).Result()
		if err == nil {
			var product models.Product
			if jsonErr := json.Unmarshal([]byte(val), &product); jsonErr == nil {
				database.CacheMetrics.RecordHit()
				return &product, nil
			}
			database.CacheMetrics.RecordSerializationFailure()
			_ = s.redisClient.Del(ctx, newKey).Err()
		} else if !errors.Is(err, redis.Nil) {
			database.CacheMetrics.RecordFallback()
			log.Printf("[WARN] Redis get failed for %s: %v", newKey, err)
		} else {
			legacyVal, legErr := s.redisClient.Get(ctx, legacyKey).Result()
			if legErr == nil {
				var product models.Product
				if jsonErr := json.Unmarshal([]byte(legacyVal), &product); jsonErr == nil {
					database.CacheMetrics.RecordHit()
					ttl := cache.ApplyJitter(5*time.Minute, 30*time.Second)
					_ = s.redisClient.Set(ctx, newKey, legacyVal, ttl).Err()
					_ = s.redisClient.Del(ctx, legacyKey).Err()
					return &product, nil
				}
				database.CacheMetrics.RecordSerializationFailure()
				_ = s.redisClient.Del(ctx, legacyKey).Err()
			}
		}
	}

	database.CacheMetrics.RecordMiss()

	v, err, _ := s.requestGroup.Do(newKey, func() (any, error) {
		prod, dbErr := s.productsRepo.GetProductByID(ctx, id)
		if dbErr != nil {
			return nil, dbErr
		}
		if prod != nil && s.redisClient != nil {
			if data, marshalErr := json.Marshal(prod); marshalErr == nil {
				ttl := cache.ApplyJitter(5*time.Minute, 30*time.Second)
				if setErr := s.redisClient.Set(ctx, newKey, data, ttl).Err(); setErr != nil {
					database.CacheMetrics.RecordSetError()
					log.Printf("[WARN] Redis set failed for %s: %v", newKey, setErr)
				}
			} else {
				database.CacheMetrics.RecordSerializationFailure()
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

func (s *ProductService) UpdateProduct(ctx context.Context, product *models.Product) error {
	if product == nil || product.ProductId <= 0 {
		return errors.New("invalid product")
	}
	if err := s.productsRepo.UpdateProduct(ctx, product); err != nil {
		return err
	}
	s.InvalidateProductCache(ctx, product.ProductId)
	if s.redisClient != nil {
		if product.Upc != "" {
			_ = s.redisClient.Del(ctx, cache.CatalogBarcodeKey(product.Upc)).Err()
		}
		if product.Brand != "" {
			_ = s.redisClient.Del(ctx, cache.CatalogBrandsKey(), cache.LegacyCatalogBrandsKey()).Err()
		}
	}
	return nil
}
