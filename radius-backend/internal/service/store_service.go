package service

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"radius/internal/cache"
	"radius/internal/database"
	"radius/internal/models"
	"radius/internal/utils"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

type StoreService struct {
	storeRepo    StoreRepository
	employeeRepo EmployeeRepository
	productsRepo ProductRepository
	redisClient  *redis.Client
	sfGroup      singleflight.Group
}

func NewStoreService(
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	productsRepo ProductRepository,
	redisClient ...*redis.Client,
) *StoreService {
	svc := &StoreService{
		storeRepo:    storeRepo,
		employeeRepo: employeeRepo,
		productsRepo: productsRepo,
	}
	if len(redisClient) > 0 && redisClient[0] != nil {
		svc.redisClient = redisClient[0]
	}
	return svc
}

func (s *StoreService) InvalidateStoreDirectoryCache(ctx context.Context) {
	if s.redisClient == nil {
		return
	}
	iter := s.redisClient.Scan(ctx, 0, cache.StoreDirectoryPattern(), 100).Iterator()
	for iter.Next(ctx) {
		if err := s.redisClient.Del(ctx, iter.Val()).Err(); err != nil && !errors.Is(err, redis.Nil) {
			database.CacheMetrics.RecordDeleteError()
		}
	}
}

func (s *StoreService) InvalidateStoreOperationsCache(ctx context.Context, storeId int) {
	if s.redisClient == nil {
		return
	}
	keys := []string{
		cache.StoreOperationsKey(storeId),
		cache.StoreOperationsGlobalKey(),
		cache.LegacyStoreOperationsKey(),
	}
	if err := s.redisClient.Del(ctx, keys...).Err(); err != nil && !errors.Is(err, redis.Nil) {
		database.CacheMetrics.RecordDeleteError()
	}
}

func (s *StoreService) GetAllStores(ctx context.Context, pageSize string, pageNumber string) (*models.GetAllStoresResponse, error) {
	pageSizeInt := 10
	pageNumberInt := 0

	num, err := strconv.Atoi(pageSize)
	if err != nil {
		log.Println("Page Size atoi conversion failed: ", err)
	} else {
		pageSizeInt = num
	}

	num, err = strconv.Atoi(pageNumber)
	if err != nil {
		log.Println("Page Number atoi conversion failed: ", err)
	} else {
		pageNumberInt = num - 1
	}

	if pageSizeInt < utils.PAGING_SIZE_MINIMUM || pageSizeInt > utils.PAGING_SIZE_MAXIMUM {
		pageSizeInt = utils.DEFAULT_PAGING_SIZE
	}

	if pageNumberInt < 0 {
		pageNumberInt = 0
	}

	cacheKey := cache.StoreDirectoryKey(pageNumberInt, pageSizeInt)
	if s.redisClient != nil {
		val, err := s.redisClient.Get(ctx, cacheKey).Result()
		if err == nil {
			var resp models.GetAllStoresResponse
			if jsonErr := json.Unmarshal([]byte(val), &resp); jsonErr == nil {
				database.CacheMetrics.RecordHit()
				return &resp, nil
			}
			database.CacheMetrics.RecordSerializationFailure()
			_ = s.redisClient.Del(ctx, cacheKey).Err()
		} else if !errors.Is(err, redis.Nil) {
			database.CacheMetrics.RecordFallback()
		}
	}

	database.CacheMetrics.RecordMiss()

	val, err, _ := s.sfGroup.Do(cacheKey, func() (any, error) {
		stores, totalLength, err := s.storeRepo.GetAllStores(ctx, pageSizeInt, pageNumberInt)
		if err != nil {
			return nil, err
		}

		resp := &models.GetAllStoresResponse{
			Stores:      stores,
			TotalLength: totalLength,
			Message:     "Retrieved stores successfully",
		}

		if s.redisClient != nil {
			if data, mErr := json.Marshal(resp); mErr == nil {
				ttl := cache.ApplyJitter(6*time.Hour, 15*time.Minute)
				if setErr := s.redisClient.Set(ctx, cacheKey, data, ttl).Err(); setErr != nil {
					database.CacheMetrics.RecordSetError()
				}
			} else {
				database.CacheMetrics.RecordSerializationFailure()
			}
		}

		return resp, nil
	})

	if err != nil {
		return nil, err
	}
	return val.(*models.GetAllStoresResponse), nil
}

func (s *StoreService) UpdateStore(ctx context.Context, body models.UpdateStoreRequest) (*models.APIMessage, error) {
	province, postalCode, err := utils.SanitizeLocation(body.Province, body.PostalCode)
	if err != nil {
		return nil, err
	}
	body.Province = province
	body.PostalCode = postalCode

	err = s.storeRepo.UpdateStore(ctx, body)
	if err != nil {
		log.Println("Error: " + err.Error())
		return nil, errors.New("error updating this store")
	}

	s.InvalidateStoreDirectoryCache(ctx)
	s.InvalidateStoreOperationsCache(ctx, body.StoreId)

	return &models.APIMessage{
		Message: "Updated store successfully!",
	}, nil
}

func (s *StoreService) CreateStore(ctx context.Context, body models.CreateStoreRequest) (*models.StoreResponse, error) {
	province, postalCode, err := utils.SanitizeLocation(body.Province, body.PostalCode)
	if err != nil {
		return nil, err
	}
	body.Province = province
	body.PostalCode = postalCode

	store, err := s.storeRepo.CreateStore(ctx, body)
	if err != nil {
		return nil, err
	}

	s.InvalidateStoreDirectoryCache(ctx)

	return &models.StoreResponse{
		Store:   *store,
		Message: "Store created successfully",
	}, nil
}

func (s *StoreService) ActivateStore(ctx context.Context, storeId int) (*models.APIMessage, error) {
	err := s.storeRepo.ActivateStore(ctx, storeId)
	if err != nil {
		return nil, err
	}
	s.InvalidateStoreDirectoryCache(ctx)
	s.InvalidateStoreOperationsCache(ctx, storeId)
	return &models.APIMessage{
		Message: "Store " + strconv.Itoa(storeId) + " activated",
	}, nil
}

func (s *StoreService) DeactivateStore(ctx context.Context, storeId int) (*models.APIMessage, error) {
	err := s.storeRepo.DeactivateStore(ctx, storeId)
	if err != nil {
		return nil, err
	}
	s.InvalidateStoreDirectoryCache(ctx)
	s.InvalidateStoreOperationsCache(ctx, storeId)
	return &models.APIMessage{
		Message: "Store " + strconv.Itoa(storeId) + " deactivated",
	}, nil
}

func (s *StoreService) GetStore(ctx context.Context, storeId string) (*models.StoreResponse, error) {
	id, err := strconv.Atoi(storeId)
	if err != nil {
		return nil, errors.New("Not a valid storeId")
	}

	store, err := s.storeRepo.GetStore(ctx, id)
	if err != nil {
		return nil, err
	}
	return &models.StoreResponse{
		Store:   *store,
		Message: "Successfully retrieved store",
	}, nil
}

func (s *StoreService) GetStoreOperations(ctx context.Context, storeID ...int) ([]models.StoreOperationSummary, error) {
	var targetStoreID int
	var cacheKey string

	if len(storeID) > 0 && storeID[0] > 0 {
		targetStoreID = storeID[0]
		cacheKey = cache.StoreOperationsKey(targetStoreID)
	} else {
		cacheKey = cache.StoreOperationsGlobalKey()
	}

	if s.redisClient != nil {
		val, err := s.redisClient.Get(ctx, cacheKey).Result()
		if err == nil {
			var ops []models.StoreOperationSummary
			if jsonErr := json.Unmarshal([]byte(val), &ops); jsonErr == nil {
				database.CacheMetrics.RecordHit()
				return ops, nil
			}
			database.CacheMetrics.RecordSerializationFailure()
			_ = s.redisClient.Del(ctx, cacheKey).Err()
		} else if !errors.Is(err, redis.Nil) {
			database.CacheMetrics.RecordFallback()
			log.Printf("[WARN] Redis get failed for %s: %v", cacheKey, err)
		} else if targetStoreID == 0 {
			legacyVal, legErr := s.redisClient.Get(ctx, cache.LegacyStoreOperationsKey()).Result()
			if legErr == nil {
				var ops []models.StoreOperationSummary
				if jsonErr := json.Unmarshal([]byte(legacyVal), &ops); jsonErr == nil {
					database.CacheMetrics.RecordHit()
					ttl := cache.ApplyJitter(30*time.Second, 5*time.Second)
					_ = s.redisClient.Set(ctx, cacheKey, legacyVal, ttl).Err()
					_ = s.redisClient.Del(ctx, cache.LegacyStoreOperationsKey()).Err()
					return ops, nil
				}
				database.CacheMetrics.RecordSerializationFailure()
				_ = s.redisClient.Del(ctx, cache.LegacyStoreOperationsKey()).Err()
			}
		}
	}

	database.CacheMetrics.RecordMiss()

	val, err, _ := s.sfGroup.Do(cacheKey, func() (any, error) {
		var ops []models.StoreOperationSummary
		var dbErr error
		if targetStoreID > 0 {
			ops, dbErr = s.storeRepo.GetStoreOperationsSummaries(ctx, targetStoreID)
		} else {
			ops, dbErr = s.storeRepo.GetStoreOperationsSummaries(ctx)
		}
		if dbErr != nil {
			return nil, dbErr
		}

		if s.redisClient != nil {
			if data, mErr := json.Marshal(ops); mErr == nil {
				ttl := cache.ApplyJitter(30*time.Second, 5*time.Second)
				if setErr := s.redisClient.Set(ctx, cacheKey, data, ttl).Err(); setErr != nil {
					database.CacheMetrics.RecordSetError()
					log.Printf("[WARN] Redis set failed for %s: %v", cacheKey, setErr)
				}
			} else {
				database.CacheMetrics.RecordSerializationFailure()
			}
		}

		return ops, nil
	})

	if err != nil {
		return nil, err
	}
	return val.([]models.StoreOperationSummary), nil
}
