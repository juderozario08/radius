package service_test

import (
	"context"
	"fmt"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/mock/gomock"
)

func TestReceivingService_ReceivePO_InvalidatesCache(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	mockReceivingRepo := mocks.NewMockReceivingRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)

	svc := service.NewReceivingService(mockReceivingRepo, mockEmployeeRepo, rdb)

	storeId := 1
	poId := 50
	employeeId := 9

	tier2Key := fmt.Sprintf("radius:v1:inventory:store:%d:product:%d", storeId, 10)
	legacyUpcKey := fmt.Sprintf("inventory:%d:barcode:%s", storeId, "123456789012")
	legacySkuKey := fmt.Sprintf("inventory:%d:barcode:%s", storeId, "SKU10")

	rdb.Set(context.Background(), tier2Key, "cached", time.Hour)
	rdb.Set(context.Background(), legacyUpcKey, "cached", time.Hour)
	rdb.Set(context.Background(), legacySkuKey, "cached", time.Hour)

	mockReceivingRepo.EXPECT().
		GetPurchaseOrderDetail(gomock.Any(), poId).
		Return(&models.PurchaseOrderDetailResponse{
			PoId:    poId,
			StoreId: storeId,
			Items: []models.PurchaseOrderItemDetail{
				{
					PoItemId:  1,
					ProductId: 10,
					Upc:       "123456789012",
					Sku:       "SKU10",
				},
			},
		}, nil)

	req := models.ReceivePORequest{
		PoId: poId,
		Items: []models.ReceivePOItemEntry{
			{PoItemId: 1, QtyReceived: 5},
		},
	}

	mockReceivingRepo.EXPECT().
		ReceivePOItems(gomock.Any(), storeId, poId, employeeId, req.Items).
		Return(nil)

	err = svc.ReceivePO(context.Background(), storeId, employeeId, "MANAGER", req)
	if err != nil {
		t.Fatalf("ReceivePO failed: %v", err)
	}

	exists, _ := rdb.Exists(context.Background(), tier2Key).Result()
	if exists != 0 {
		t.Fatalf("expected tier2Key to be deleted, but still exists")
	}
	existsUpc, _ := rdb.Exists(context.Background(), legacyUpcKey).Result()
	if existsUpc != 0 {
		t.Fatalf("expected legacyUpcKey to be deleted, but still exists")
	}
	existsSku, _ := rdb.Exists(context.Background(), legacySkuKey).Result()
	if existsSku != 0 {
		t.Fatalf("expected legacySkuKey to be deleted, but still exists")
	}
}

func TestReceivingService_GetPurchaseOrders_StoreFilter(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockReceivingRepo := mocks.NewMockReceivingRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)

	svc := service.NewReceivingService(mockReceivingRepo, mockEmployeeRepo)

	storeId := 2
	expectedOrders := []models.PurchaseOrderSummary{
		{PoId: 101, Status: "ORDERED"},
	}

	mockReceivingRepo.EXPECT().
		GetPurchaseOrders(gomock.Any(), &storeId).
		Return(expectedOrders, nil)

	orders, err := svc.GetPurchaseOrders(context.Background(), storeId, "MANAGER", nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(orders) != 1 {
		t.Fatalf("expected 1 order, got %d", len(orders))
	}
}
