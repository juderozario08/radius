package service

import (
	"context"
	"encoding/json"
	"fmt"
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
	key := fmt.Sprintf("is4tc_session:%d", storeID)
	result, err := s.redisClient.HGetAll(ctx, key).Result()
	if err != nil {
		if strings.Contains(err.Error(), "WRONGTYPE") {
			val, getErr := s.redisClient.Get(ctx, key).Result()
			if getErr == nil {
				var oldItems []models.MimsProductInventory
				if json.Unmarshal([]byte(val), &oldItems) == nil {
					_ = s.redisClient.Del(ctx, key).Err()
					for _, item := range oldItems {
						if d, mErr := json.Marshal(item); mErr == nil {
							_ = s.redisClient.HSet(ctx, key, fmt.Sprintf("%d", item.ProductId), d).Err()
						}
					}
					_ = s.redisClient.Expire(ctx, key, 24*time.Hour).Err()
					return oldItems, nil
				}
			}
		}
		return nil, err
	}

	if len(result) == 0 {
		return []models.MimsProductInventory{}, nil
	}

	items := make([]models.MimsProductInventory, 0, len(result))
	for _, itemJSON := range result {
		var item models.MimsProductInventory
		if err := json.Unmarshal([]byte(itemJSON), &item); err == nil {
			items = append(items, item)
		}
	}
	return items, nil
}

func (s *FillReportService) AddToIS4TCSession(ctx context.Context, storeID int, product models.MimsProductInventory, employeeID *int) ([]models.MimsProductInventory, error) {
	if s.fillReportRepo != nil {
		_ = s.fillReportRepo.AddEmptyHole(ctx, storeID, product.ProductId, employeeID)
	}

	data, err := json.Marshal(product)
	if err != nil {
		return nil, err
	}

	key := fmt.Sprintf("is4tc_session:%d", storeID)
	field := fmt.Sprintf("%d", product.ProductId)

	err = s.redisClient.HSet(ctx, key, field, data).Err()
	if err != nil && strings.Contains(err.Error(), "WRONGTYPE") {
		_ = s.redisClient.Del(ctx, key).Err()
		err = s.redisClient.HSet(ctx, key, field, data).Err()
	}
	if err != nil {
		return nil, err
	}

	_ = s.redisClient.Expire(ctx, key, 24*time.Hour).Err()

	return s.GetActiveIS4TCSession(ctx, storeID)
}

func (s *FillReportService) ClearIS4TCSession(ctx context.Context, storeID int) error {
	key := fmt.Sprintf("is4tc_session:%d", storeID)
	return s.redisClient.Del(ctx, key).Err()
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
