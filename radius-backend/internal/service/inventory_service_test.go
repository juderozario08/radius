package service_test

import (
	"context"
	"fmt"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"sync"
	"sync/atomic"
	"testing"
	"time"

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

func TestInventoryService_ScanProduct_NegativeCaching(t *testing.T) {
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

	storeId := 2
	employeeId := 10
	barcode := "99999999999999"

	inventoryRepo.EXPECT().
		GetInventoryByBarcode(gomock.Any(), storeId, barcode).
		Return(nil, nil).
		Times(1)

	inventoryRepo.EXPECT().
		LogScan(gomock.Any(), gomock.Any()).
		Return(nil).
		AnyTimes()

	res1, err := svc.ScanProduct(context.Background(), storeId, employeeId, barcode)
	if err != nil {
		t.Fatalf("first scan failed: %v", err)
	}
	if res1.Product != nil {
		t.Fatalf("expected nil product, got %v", res1.Product)
	}

	res2, err := svc.ScanProduct(context.Background(), storeId, employeeId, barcode)
	if err != nil {
		t.Fatalf("second scan failed: %v", err)
	}
	if res2.Product != nil {
		t.Fatalf("expected nil product from negative cache, got %v", res2.Product)
	}
}

func TestInventoryService_ScanProduct_SingleflightDeduplication(t *testing.T) {
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
	barcode := "88888888888888"

	mockProduct := &models.MimsProductInventory{
		ProductId: 202,
		Sku:       "SKU202",
		Upc:       barcode,
		Name:      "Singleflight Item",
		OnHandQty: 50,
	}

	var callCount int64
	inventoryRepo.EXPECT().
		GetInventoryByBarcode(gomock.Any(), storeId, barcode).
		DoAndReturn(func(ctx context.Context, sID int, bc string) (*models.MimsProductInventory, error) {
			atomic.AddInt64(&callCount, 1)
			time.Sleep(50 * time.Millisecond)
			return mockProduct, nil
		}).
		Times(1)

	inventoryRepo.EXPECT().
		LogScan(gomock.Any(), gomock.Any()).
		Return(nil).
		AnyTimes()

	concurrency := 20
	var wg sync.WaitGroup
	errCh := make(chan error, concurrency)

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			res, err := svc.ScanProduct(context.Background(), storeId, employeeId, barcode)
			if err != nil {
				errCh <- err
				return
			}
			if res.Product == nil || res.Product.ProductId != 202 {
				errCh <- fmt.Errorf("unexpected product")
				return
			}
		}()
	}

	wg.Wait()
	close(errCh)

	for err := range errCh {
		if err != nil {
			t.Fatalf("concurrent scan error: %v", err)
		}
	}

	if atomic.LoadInt64(&callCount) != 1 {
		t.Fatalf("expected exactly 1 DB call, got %d", atomic.LoadInt64(&callCount))
	}
}

func TestInventoryService_BinItem_InvalidatesCache(t *testing.T) {
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
	barcode := "55555555555555"
	productId := 303
	locId := "A-01"

	tier2Key := fmt.Sprintf("radius:v1:inventory:store:%d:product:%d", storeId, productId)
	rdb.Set(context.Background(), tier2Key, "cached_data", time.Hour)

	inventoryRepo.EXPECT().CheckLocationExists(gomock.Any(), storeId, locId).Return(true, nil)
	inventoryRepo.EXPECT().GetInventoryByBarcode(gomock.Any(), storeId, barcode).Return(&models.MimsProductInventory{
		ProductId: productId,
		OnHandQty: 10,
	}, nil).Times(2)
	inventoryRepo.EXPECT().LogScan(gomock.Any(), gomock.Any()).Return(nil)
	inventoryRepo.EXPECT().LinkProductToLocation(gomock.Any(), storeId, locId, productId).Return(nil)
	inventoryRepo.EXPECT().IncrementInventoryQuantity(gomock.Any(), storeId, productId, 1).Return(nil)

	_, err = svc.BinItem(context.Background(), storeId, employeeId, models.BinItemRequest{
		Barcode:    barcode,
		LocationId: locId,
		Action:     "IN",
	})
	if err != nil {
		t.Fatalf("BinItem failed: %v", err)
	}

	exists, _ := rdb.Exists(context.Background(), tier2Key).Result()
	if exists != 0 {
		t.Fatalf("expected tier2Key to be deleted after BinItem, but it still exists")
	}
}

func TestInventoryService_UpdateQuantity_InvalidatesCache(t *testing.T) {
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
	productId := 404
	tier2Key := fmt.Sprintf("radius:v1:inventory:store:%d:product:%d", storeId, productId)
	rdb.Set(context.Background(), tier2Key, "cached_data", time.Hour)

	inventoryRepo.EXPECT().UpdateInventoryQuantity(gomock.Any(), storeId, productId, 25).Return(nil)

	err = svc.UpdateQuantity(context.Background(), storeId, models.UpdateQuantityRequest{
		ProductId: productId,
		Quantity:  25,
	})
	if err != nil {
		t.Fatalf("UpdateQuantity failed: %v", err)
	}

	exists, _ := rdb.Exists(context.Background(), tier2Key).Result()
	if exists != 0 {
		t.Fatalf("expected tier2Key to be deleted after UpdateQuantity, but it still exists")
	}
}

func TestInventoryService_ScanProduct_FailOpen(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	mr.Close()

	storeRepo := mocks.NewMockStoreRepository(ctrl)
	employeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	sessionRepo := mocks.NewMockSessionRepository(ctrl)
	inventoryRepo := mocks.NewMockInventoryRepository(ctrl)
	productRepo := mocks.NewMockProductRepository(ctrl)

	svc := service.NewInventoryService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productRepo, rdb)

	storeId := 1
	employeeId := 42
	barcode := "11111111111111"

	inventoryRepo.EXPECT().
		GetInventoryByBarcode(gomock.Any(), storeId, barcode).
		Return(&models.MimsProductInventory{
			ProductId: 505,
			OnHandQty: 10,
		}, nil).
		Times(1)

	inventoryRepo.EXPECT().
		LogScan(gomock.Any(), gomock.Any()).
		Return(nil).
		AnyTimes()

	res, err := svc.ScanProduct(context.Background(), storeId, employeeId, barcode)
	if err != nil {
		t.Fatalf("expected fail-open to succeed, got %v", err)
	}
	if res.Product == nil || res.Product.ProductId != 505 {
		t.Fatalf("expected product 505, got %v", res.Product)
	}
}
