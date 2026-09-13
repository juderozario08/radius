package service

import (
	"context"
	"encoding/json"
	"errors"
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
	if s.fillReportRepo != nil {
		_ = s.fillReportRepo.AddEmptyHole(ctx, storeID, product.ProductId, employeeID)
	}

	items, err := s.GetActiveIS4TCSession(ctx, storeID)
	if err != nil {
		return nil, err
	}

	for _, item := range items {
		if item.ProductId == product.ProductId {
			return items, nil
		}
	}

	items = append([]models.MimsProductInventory{product}, items...)

	data, err := json.Marshal(items)
	if err != nil {
		return nil, err
	}

	key := fmt.Sprintf("is4tc_session:%d", storeID)
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

func (s *FillReportService) GetEmployeeStoreID(ctx context.Context, email string) (int, error) {
	if s.employeeRepo == nil {
		return 0, errors.New("employee repository is not configured")
	}
	if email == "" {
		return 0, errors.New("email is empty")
	}
	emp, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return 0, err
	}
	if emp == nil {
		return 0, errors.New("employee not found")
	}
	return emp.StoreId, nil
}
