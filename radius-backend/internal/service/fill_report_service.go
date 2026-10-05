package service

import (
	"context"
	"encoding/json"
	"fmt"
	"radius/internal/cache"
	"radius/internal/database"
	"radius/internal/models"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

type FillReportService struct {
	fillReportRepo FillReportRepository
	storeRepo      StoreRepository
	employeeRepo   EmployeeRepository
	sessionRepo    SessionRepository
	inventoryRepo  InventoryRepository
	productsRepo   ProductRepository
	redisClient    *redis.Client
}

func NewFillReportService(
	fillReportRepo FillReportRepository,
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
	inventoryRepo InventoryRepository,
	productsRepo ProductRepository,
	redisClient *redis.Client,
) *FillReportService {
	return &FillReportService{
		fillReportRepo: fillReportRepo,
		storeRepo:      storeRepo,
		employeeRepo:   employeeRepo,
		sessionRepo:    sessionRepo,
		inventoryRepo:  inventoryRepo,
		productsRepo:   productsRepo,
		redisClient:    redisClient,
	}
}

func (s *FillReportService) GetActiveIS4TCSession(ctx context.Context, storeID int) ([]models.MimsProductInventory, error) {
	if s.redisClient == nil {
		return []models.MimsProductInventory{}, nil
	}

	newKey := cache.IS4TCStoreKey(storeID)
	legacyKey := cache.LegacyIS4TCKey(storeID)

	result, err := s.redisClient.HGetAll(ctx, newKey).Result()
	if err != nil && strings.Contains(err.Error(), "WRONGTYPE") {
		val, getErr := s.redisClient.Get(ctx, newKey).Result()
		_ = s.redisClient.Del(ctx, newKey).Err()
		if getErr == nil {
			var oldItems []models.MimsProductInventory
			if json.Unmarshal([]byte(val), &oldItems) == nil {
				for _, item := range oldItems {
					if d, mErr := json.Marshal(item); mErr == nil {
						_ = s.redisClient.HSet(ctx, newKey, fmt.Sprintf("%d", item.ProductId), d).Err()
					}
				}
				_ = s.redisClient.Expire(ctx, newKey, 24*time.Hour).Err()
				return oldItems, nil
			}
		}
		result = nil
		err = nil
	}

	if (err == nil && len(result) == 0) || err != nil {
		legacyResult, legErr := s.redisClient.HGetAll(ctx, legacyKey).Result()
		if legErr == nil && len(legacyResult) > 0 {
			result = legacyResult
			for f, v := range legacyResult {
				_ = s.redisClient.HSet(ctx, newKey, f, v).Err()
			}
			_ = s.redisClient.Expire(ctx, newKey, 24*time.Hour).Err()
			_ = s.redisClient.Del(ctx, legacyKey).Err()
		} else if legErr != nil && strings.Contains(legErr.Error(), "WRONGTYPE") {
			val, getErr := s.redisClient.Get(ctx, legacyKey).Result()
			if getErr == nil {
				var oldItems []models.MimsProductInventory
				if json.Unmarshal([]byte(val), &oldItems) == nil {
					_ = s.redisClient.Del(ctx, legacyKey).Err()
					for _, item := range oldItems {
						if d, mErr := json.Marshal(item); mErr == nil {
							_ = s.redisClient.HSet(ctx, newKey, fmt.Sprintf("%d", item.ProductId), d).Err()
						}
					}
					_ = s.redisClient.Expire(ctx, newKey, 24*time.Hour).Err()
					return oldItems, nil
				}
			}
		}
	}

	if len(result) == 0 {
		database.CacheMetrics.RecordMiss()
		return []models.MimsProductInventory{}, nil
	}

	database.CacheMetrics.RecordHit()
	items := make([]models.MimsProductInventory, 0, len(result))
	for field, itemJSON := range result {
		var item models.MimsProductInventory
		if unmarshalErr := json.Unmarshal([]byte(itemJSON), &item); unmarshalErr == nil {
			items = append(items, item)
		} else {
			database.CacheMetrics.RecordSerializationFailure()
			_ = s.redisClient.HDel(ctx, newKey, field).Err()
		}
	}
	return items, nil
}

func (s *FillReportService) AddToIS4TCSession(ctx context.Context, storeID int, product models.MimsProductInventory, employeeID *int) ([]models.MimsProductInventory, error) {
	if s.fillReportRepo != nil {
		_ = s.fillReportRepo.AddEmptyHole(ctx, storeID, product.ProductId, employeeID)
	}

	if s.redisClient == nil {
		return []models.MimsProductInventory{product}, nil
	}

	data, err := json.Marshal(product)
	if err != nil {
		database.CacheMetrics.RecordSerializationFailure()
		return nil, err
	}

	newKey := cache.IS4TCStoreKey(storeID)
	legacyKey := cache.LegacyIS4TCKey(storeID)
	field := fmt.Sprintf("%d", product.ProductId)

	err = s.redisClient.HSet(ctx, newKey, field, data).Err()
	if err != nil && strings.Contains(err.Error(), "WRONGTYPE") {
		_ = s.redisClient.Del(ctx, newKey).Err()
		err = s.redisClient.HSet(ctx, newKey, field, data).Err()
	}
	if err != nil {
		database.CacheMetrics.RecordSetError()
		return nil, err
	}

	_ = s.redisClient.Expire(ctx, newKey, 24*time.Hour).Err()
	_ = s.redisClient.Del(ctx, legacyKey).Err()

	return s.GetActiveIS4TCSession(ctx, storeID)
}

func (s *FillReportService) ClearIS4TCSession(ctx context.Context, storeID int) error {
	if s.redisClient == nil {
		return nil
	}
	newKey := cache.IS4TCStoreKey(storeID)
	legacyKey := cache.LegacyIS4TCKey(storeID)
	return s.redisClient.Del(ctx, newKey, legacyKey).Err()
}

func (s *FillReportService) GetStoreFillReport(ctx context.Context, storeID int, filter models.FillReportFilter) (*models.FillReportResponse, error) {
	report, items, err := s.fillReportRepo.GetActiveFillReportForStore(ctx, storeID, filter)
	if err != nil {
		return nil, err
	}

	totalItems := len(items)
	fillQtySum := 0
	is4tcCount := 0

	for _, item := range items {
		if item.IsEmptyHole {
			is4tcCount++
		} else {
			fillQtySum += item.FillQty
		}
	}

	return &models.FillReportResponse{
		FillReport: *report,
		Items:      items,
		TotalItems: totalItems,
		FillQtySum: fillQtySum,
		Is4tcCount: is4tcCount,
	}, nil
}

func (s *FillReportService) LogEmptyHole(ctx context.Context, storeID int, productID int, employeeID *int) error {
	return s.fillReportRepo.AddEmptyHole(ctx, storeID, productID, employeeID)
}

func (s *FillReportService) LogSoldItems(ctx context.Context, storeID int, items []models.TransactionItem) error {
	return s.fillReportRepo.AddSoldItems(ctx, storeID, items)
}
