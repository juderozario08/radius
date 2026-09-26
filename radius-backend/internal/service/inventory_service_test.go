package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/mock/gomock"
)

func TestInventoryService_GetPendingAdjustments_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	storeRepo := mocks.NewMockStoreRepository(ctrl)
	employeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	sessionRepo := mocks.NewMockSessionRepository(ctrl)
	inventoryRepo := mocks.NewMockInventoryRepository(ctrl)
	productRepo := mocks.NewMockProductRepository(ctrl)

	svc := service.NewInventoryService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productRepo, nil)

	storeId := 5

	expectedAdjustments := []models.PendingAdjustmentDetail{
		{AdjustmentId: 1, ProductId: 10, PreviousQty: 5, AdjustedQty: 3, Reason: "Damage"},
		{AdjustmentId: 2, ProductId: 11, PreviousQty: 2, AdjustedQty: 0, Reason: "Shrink"},
	}

	inventoryRepo.EXPECT().
		GetPendingAdjustments(gomock.Any(), storeId).
		Return(expectedAdjustments, nil)

	res, err := svc.GetPendingAdjustments(context.Background(), storeId)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(res) != 2 {
		t.Fatalf("expected 2 adjustments, got %d", len(res))
	}
}

func TestInventoryService_ReviewAdjustments_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	storeRepo := mocks.NewMockStoreRepository(ctrl)
	employeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	sessionRepo := mocks.NewMockSessionRepository(ctrl)
	inventoryRepo := mocks.NewMockInventoryRepository(ctrl)
	productRepo := mocks.NewMockProductRepository(ctrl)

	svc := service.NewInventoryService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productRepo, nil)

	storeId := 5
	employeeId := 99

	req := models.ReviewAdjustmentRequest{
		Reviews: []models.ReviewAdjustmentItem{
			{AdjustmentId: 1, Status: models.AdjustmentStatusApproved},
			{AdjustmentId: 2, Status: models.AdjustmentStatusRejected},
		},
	}

	inventoryRepo.EXPECT().
		ReviewAdjustments(gomock.Any(), storeId, employeeId, req.Reviews).
		Return(nil)

	err := svc.ReviewAdjustments(context.Background(), storeId, employeeId, models.RoleManager, req)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestInventoryService_ReviewAdjustments_NotManager(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	storeRepo := mocks.NewMockStoreRepository(ctrl)
	employeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	sessionRepo := mocks.NewMockSessionRepository(ctrl)
	inventoryRepo := mocks.NewMockInventoryRepository(ctrl)
	productRepo := mocks.NewMockProductRepository(ctrl)

	svc := service.NewInventoryService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productRepo, nil)

	storeId := 5
	employeeId := 99

	req := models.ReviewAdjustmentRequest{
		Reviews: []models.ReviewAdjustmentItem{
			{AdjustmentId: 1, Status: models.AdjustmentStatusApproved},
		},
	}

	err := svc.ReviewAdjustments(context.Background(), storeId, employeeId, models.RoleSales, req)
	if err == nil {
		t.Fatalf("expected error for unauthorized employee, got nil")
	}
	if err.Error() != "unauthorized" {
		t.Fatalf("expected 'unauthorized' error, got %v", err)
	}
}

func TestInventoryService_ScanProduct_RedisCache(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	storeRepo := mocks.NewMockStoreRepository(ctrl)
	employeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	sessionRepo := mocks.NewMockSessionRepository(ctrl)
	inventoryRepo := mocks.NewMockInventoryRepository(ctrl)
	productRepo := mocks.NewMockProductRepository(ctrl)

	svc := service.NewInventoryService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productRepo, rdb)

	storeId := 1
	employeeId := 42
	barcode := "01234567890123"

	mockProduct := &models.MimsProductInventory{
		ProductId: 101,
		Sku:       "SKU101",
		Upc:       barcode,
		Name:      "Widget",
		OnHandQty: 15,
	}

	inventoryRepo.EXPECT().
		GetInventoryByBarcode(gomock.Any(), storeId, barcode).
		Return(mockProduct, nil).
		Times(1)

	inventoryRepo.EXPECT().
		LogScan(gomock.Any(), gomock.Any()).
		Return(nil).
		AnyTimes()

	res1, err := svc.ScanProduct(context.Background(), storeId, employeeId, barcode)
	if err != nil {
		t.Fatalf("first scan failed: %v", err)
	}
	if res1.Product.ProductId != 101 {
		t.Fatalf("expected product 101, got %d", res1.Product.ProductId)
	}

	res2, err := svc.ScanProduct(context.Background(), storeId, employeeId, barcode)
	if err != nil {
		t.Fatalf("second scan failed: %v", err)
	}
	if res2.Product.ProductId != 101 {
		t.Fatalf("expected product 101 from cache, got %d", res2.Product.ProductId)
	}
}
