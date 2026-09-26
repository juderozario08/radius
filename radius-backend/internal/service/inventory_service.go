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

type InventoryService struct {
	storeRepo     StoreRepository
	employeeRepo  EmployeeRepository
	sessionRepo   SessionRepository
	inventoryRepo InventoryRepository
	productsRepo  ProductRepository
	redisClient   *redis.Client
}

func NewInventoryService(
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
	inventoryRepo InventoryRepository,
	productsRepo ProductRepository,
	redisClient *redis.Client,
) *InventoryService {
	return &InventoryService{
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
		inventoryRepo: inventoryRepo,
		productsRepo:  productsRepo,
		redisClient:   redisClient,
	}
}

func (s *InventoryService) ScanProduct(ctx context.Context, storeId int, employeeId int, barcode string) (*models.ScanProductResponse, error) {
	cacheKey := fmt.Sprintf("inventory:%d:barcode:%s", storeId, barcode)
	if s.redisClient != nil {
		if val, err := s.redisClient.Get(ctx, cacheKey).Result(); err == nil {
			var product models.MimsProductInventory
			if json.Unmarshal([]byte(val), &product) == nil {
				go func() {
					_ = s.inventoryRepo.LogScan(context.Background(), models.MimsScanLog{
						StoreId:        storeId,
						EmployeeId:     employeeId,
						ProductId:      &product.ProductId,
						ScannedBarcode: barcode,
						ScanType:       "MIMS",
					})
				}()
				return &models.ScanProductResponse{
					Product: &product,
					Message: "Product found",
				}, nil
			}
		}
	}

	product, err := s.inventoryRepo.GetInventoryByBarcode(ctx, storeId, barcode)
	if err != nil {
		return nil, err
	}

	var productId *int
	if product != nil {
		productId = &product.ProductId
	}

	_ = s.inventoryRepo.LogScan(ctx, models.MimsScanLog{
		StoreId:        storeId,
		EmployeeId:     employeeId,
		ProductId:      productId,
		ScannedBarcode: barcode,
		ScanType:       "MIMS",
	})

	if product == nil {
		return &models.ScanProductResponse{
			Product: nil,
			Message: "No product found for this barcode",
		}, nil
	}

	if s.redisClient != nil {
		if data, err := json.Marshal(product); err == nil {
			_ = s.redisClient.Set(ctx, cacheKey, data, 60*time.Second).Err()
		}
	}

	return &models.ScanProductResponse{
		Product: product,
		Message: "Product found",
	}, nil
}

func (s *InventoryService) GetLocationProducts(ctx context.Context, storeId int, employeeId int, locationID string) (*models.LocationProductsResponse, error) {
	_ = s.inventoryRepo.LogScan(ctx, models.MimsScanLog{
		StoreId:        storeId,
		EmployeeId:     employeeId,
		ScannedBarcode: locationID,
		MimsLocationId: &locationID,
		ScanType:       "LOCATION",
	})

	exists, err := s.inventoryRepo.CheckLocationExists(ctx, storeId, locationID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return &models.LocationProductsResponse{
			LocationId: locationID,
			Products:   nil,
			Message:    "Bin location does not exist",
		}, nil
	}

	products, err := s.inventoryRepo.GetProductsByLocation(ctx, storeId, locationID)
	if err != nil {
		return nil, err
	}

	return &models.LocationProductsResponse{
		LocationId: locationID,
		Products:   products,
		Message:    "Location products retrieved",
	}, nil
}

func (s *InventoryService) BinItem(ctx context.Context, storeId int, employeeId int, req models.BinItemRequest) (*models.MimsProductInventory, error) {
	exists, err := s.inventoryRepo.CheckLocationExists(ctx, storeId, req.LocationId)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("location does not exist")
	}

	inventory, err := s.inventoryRepo.GetInventoryByBarcode(ctx, storeId, req.Barcode)
	if err != nil {
		return nil, err
	}
	if inventory == nil {
		return nil, errors.New("product not found in inventory")
	}

	_ = s.inventoryRepo.LogScan(ctx, models.MimsScanLog{
		StoreId:        storeId,
		EmployeeId:     employeeId,
		ProductId:      &inventory.ProductId,
		ScannedBarcode: req.Barcode,
		MimsLocationId: &req.LocationId,
		ScanType:       "BIN_" + req.Action,
	})

	if req.Action == "OUT" {
		inLocation, err := s.inventoryRepo.CheckProductInLocation(ctx, storeId, req.LocationId, inventory.ProductId)
		if err != nil {
			return nil, err
		}
		if !inLocation {
			return nil, errors.New("Product is not in this bin")
		}
		err = s.inventoryRepo.IncrementInventoryQuantity(ctx, storeId, inventory.ProductId, -1)
		if err != nil {
			return nil, err
		}
	} else if req.Action == "IN" {
		err = s.inventoryRepo.LinkProductToLocation(ctx, storeId, req.LocationId, inventory.ProductId)
		if err != nil {
			return nil, err
		}
		err = s.inventoryRepo.IncrementInventoryQuantity(ctx, storeId, inventory.ProductId, 1)
		if err != nil {
			return nil, err
		}
	}

	return s.inventoryRepo.GetInventoryByBarcode(ctx, storeId, req.Barcode)
}

func (s *InventoryService) UpdateQuantity(ctx context.Context, storeId int, req models.UpdateQuantityRequest) error {
	return s.inventoryRepo.UpdateInventoryQuantity(ctx, storeId, req.ProductId, req.Quantity)
}

func (s *InventoryService) GetProductScreenDetails(ctx context.Context, storeId int, productID int) (*models.ProductScreenDetails, error) {
	return s.inventoryRepo.GetProductScreenDetails(ctx, storeId, productID)
}

func (s *InventoryService) SyncLocations(ctx context.Context, storeId int, req models.SyncLocationsRequest) error {
	for _, loc := range req.Locations {
		if loc.MimsLocationId != nil {
			exists, err := s.inventoryRepo.CheckLocationExists(ctx, storeId, *loc.MimsLocationId)
			if err != nil {
				return err
			}
			if !exists {
				return fmt.Errorf("location %s does not exist", *loc.MimsLocationId)
			}
		}
	}

	return s.inventoryRepo.SyncLocations(ctx, storeId, req.InventoryId, req.Locations)
}

func (s *InventoryService) CreateMimsLocation(ctx context.Context, storeId int, req models.CreateMimsLocationRequest) error {
	return s.inventoryRepo.CreateMimsLocation(ctx, storeId, req.LocationId)
}

func (s *InventoryService) CreateInventoryAdjustment(ctx context.Context, storeId int, employeeId int, req models.AdjustInventoryRequest) error {
	adj := models.InventoryAdjustment{
		StoreId:     storeId,
		InventoryId: req.InventoryId,
		ProductId:   req.ProductId,
		PreviousQty: req.PreviousQty,
		AdjustedQty: req.AdjustedQty,
		Reason:      req.Reason,
		RequestedBy: employeeId,
	}

	return s.inventoryRepo.CreateInventoryAdjustment(ctx, adj)
}

func (s *InventoryService) GetPendingAdjustments(ctx context.Context, storeId int) ([]models.PendingAdjustmentDetail, error) {
	return s.inventoryRepo.GetPendingAdjustments(ctx, storeId)
}

func (s *InventoryService) ReviewAdjustments(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, req models.ReviewAdjustmentRequest) error {
	if role != models.RoleManager && role != models.RoleAdmin {
		return errors.New("unauthorized")
	}

	return s.inventoryRepo.ReviewAdjustments(ctx, storeId, employeeId, req.Reviews)
}
