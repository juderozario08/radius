package service

import (
	"context"
	"encoding/json"
	"fmt"
	"radius/internal/models"
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
	val, err := s.redisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		return []models.MimsProductInventory{}, nil
	} else if err != nil {
		return nil, err
	}

	var items []models.MimsProductInventory
	if err := json.Unmarshal([]byte(val), &items); err != nil {
		return nil, err
	}
	return items, nil
}

func (s *FillReportService) AddToIS4TCSession(ctx context.Context, storeID int, product models.MimsProductInventory, employeeID *int) ([]models.MimsProductInventory, error) {
	// 1. Automatically log empty hole to DB Fill Report
	if s.fillReportRepo != nil {
		_ = s.fillReportRepo.AddEmptyHole(ctx, storeID, product.ProductId, employeeID)
	}

	// 2. Add to active Redis session
	items, err := s.GetActiveIS4TCSession(ctx, storeID)
	if err != nil {
		return nil, err
	}

	// Avoid duplicates in memory session
	for _, item := range items {
		if item.ProductId == product.ProductId {
			return items, nil
		}
	}

	// Add to front of the list
	items = append([]models.MimsProductInventory{product}, items...)

	data, err := json.Marshal(items)
	if err != nil {
		return nil, err
	}

	key := fmt.Sprintf("is4tc_session:%d", storeID)
	// Expire after 24 hours of inactivity
	err = s.redisClient.Set(ctx, key, data, 24*time.Hour).Err()
	if err != nil {
		return nil, err
	}

	return items, nil
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
