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
	storeRepo     StoreRepository
	employeeRepo  EmployeeRepository
	sessionRepo   SessionRepository
	inventoryRepo InventoryRepository
	productsRepo  ProductRepository
	redisClient   *redis.Client
}

func NewFillReportService(
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
	inventoryRepo InventoryRepository,
	productsRepo ProductRepository,
	redisClient *redis.Client,
) *FillReportService {
	return &FillReportService{
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
		inventoryRepo: inventoryRepo,
		productsRepo:  productsRepo,
		redisClient:   redisClient,
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

func (s *FillReportService) AddToIS4TCSession(ctx context.Context, storeID int, product models.MimsProductInventory) ([]models.MimsProductInventory, error) {
	items, err := s.GetActiveIS4TCSession(ctx, storeID)
	if err != nil {
		return nil, err
	}

	// Avoid duplicates
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
	// Expire after 24 hours of inactivity just to be safe
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

func (s *FillReportService) GetStoreFillReport(ctx context.Context, storeID int, userRole models.EmployeeRole, userStoreId int) (*models.FillReport, []models.FillReportItemDetail, error) {
	return nil, nil, nil
}

func (s *FillReportService) LogEmptyHole(ctx context.Context, storeID int, productID int, employeeID int) error {
	return nil
}
