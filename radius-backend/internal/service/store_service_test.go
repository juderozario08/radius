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

func TestStoreService_GetStore_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockStoreRepo := mocks.NewMockStoreRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockProductRepo := mocks.NewMockProductRepository(ctrl)

	svc := service.NewStoreService(mockStoreRepo, mockEmployeeRepo, mockProductRepo)

	mockStoreRepo.EXPECT().
		GetStore(gomock.Any(), 1).
		Return(&models.Store{
			StoreId: 1,
			StoreBase: models.StoreBase{
				Name: "Test Store",
			},
		}, nil)

	storeRes, err := svc.GetStore(context.Background(), "1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if storeRes.Store.Name != "Test Store" {
		t.Fatalf("expected 'Test Store', got '%s'", storeRes.Store.Name)
	}
}

func TestStoreService_UpdateStore_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockStoreRepo := mocks.NewMockStoreRepository(ctrl)
	svc := service.NewStoreService(mockStoreRepo, nil, nil)

	mockStoreRepo.EXPECT().
		UpdateStore(gomock.Any(), gomock.Any()).
		Return(nil)

	res, err := svc.UpdateStore(context.Background(), models.UpdateStoreRequest{
		StoreId: 1,
		StoreBase: models.StoreBase{
			Name:       "New Name",
			Province:   "Ontario",
			PostalCode: "M5V 2H1",
		},
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if res.Message != "Updated store successfully!" {
		t.Fatalf("expected success message")
	}
}

func TestStoreService_GetStoreOperations(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockStoreRepo := mocks.NewMockStoreRepository(ctrl)
	svc := service.NewStoreService(mockStoreRepo, nil, nil)

	mockStoreRepo.EXPECT().
		GetStoreOperationsSummaries(gomock.Any()).
		Return([]models.StoreOperationSummary{
			{
				StoreID:             1,
				Name:                "Head Office",
				IsHeadOffice:        true,
				ActiveOrdersCount:   0,
				ActiveCountsCount:   0,
				PendingPosCount:     0,
				HasActiveOperations: false,
			},
			{
				StoreID:             2,
				Name:                "Toronto Flagship",
				IsHeadOffice:        false,
				ActiveOrdersCount:   4,
				ActiveCountsCount:   1,
				PendingPosCount:     2,
				HasActiveOperations: true,
			},
		}, nil)

	summaries, err := svc.GetStoreOperations(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(summaries) != 2 {
		t.Fatalf("expected 2 store operation summaries, got %d", len(summaries))
	}
	if !summaries[0].IsHeadOffice {
		t.Errorf("expected Store 1 to be Head Office")
	}
	if summaries[1].ActiveOrdersCount != 4 || !summaries[1].HasActiveOperations {
		t.Errorf("expected Store 2 to have active operations with 4 orders")
	}
}

func TestStoreService_GetStoreOperations_RedisCache(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	mockStoreRepo := mocks.NewMockStoreRepository(ctrl)
	svc := service.NewStoreService(mockStoreRepo, nil, nil, rdb)

	mockStoreRepo.EXPECT().
		GetStoreOperationsSummaries(gomock.Any()).
		Return([]models.StoreOperationSummary{
			{
				StoreID:             1,
				Name:                "Head Office",
				IsHeadOffice:        true,
				ActiveOrdersCount:   0,
				ActiveCountsCount:   0,
				PendingPosCount:     0,
				HasActiveOperations: false,
			},
		}, nil).
		Times(1)

	res1, err := svc.GetStoreOperations(context.Background())
	if err != nil {
		t.Fatalf("first call failed: %v", err)
	}
	if len(res1) != 1 || res1[0].StoreID != 1 {
		t.Fatalf("unexpected res1: %+v", res1)
	}

	res2, err := svc.GetStoreOperations(context.Background())
	if err != nil {
		t.Fatalf("second call failed: %v", err)
	}
	if len(res2) != 1 || res2[0].StoreID != 1 {
		t.Fatalf("unexpected res2: %+v", res2)
	}
}

func TestStoreService_GetStoreOperations_CrossStoreIsolation(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	mockStoreRepo := mocks.NewMockStoreRepository(ctrl)
	svc := service.NewStoreService(mockStoreRepo, nil, nil, rdb)

	mockStoreRepo.EXPECT().
		GetStoreOperationsSummaries(gomock.Any(), 10).
		Return([]models.StoreOperationSummary{
			{StoreID: 10, Name: "Store Ten", ActiveOrdersCount: 2},
		}, nil).
		Times(1)

	mockStoreRepo.EXPECT().
		GetStoreOperationsSummaries(gomock.Any(), 20).
		Return([]models.StoreOperationSummary{
			{StoreID: 20, Name: "Store Twenty", ActiveOrdersCount: 8},
		}, nil).
		Times(1)

	resStore10, err := svc.GetStoreOperations(context.Background(), 10)
	if err != nil {
		t.Fatalf("Store 10 failed: %v", err)
	}
	if len(resStore10) != 1 || resStore10[0].StoreID != 10 {
		t.Fatalf("Store 10 unexpected response: %+v", resStore10)
	}

	resStore20, err := svc.GetStoreOperations(context.Background(), 20)
	if err != nil {
		t.Fatalf("Store 20 failed: %v", err)
	}
	if len(resStore20) != 1 || resStore20[0].StoreID != 20 {
		t.Fatalf("Store 20 unexpected response: %+v", resStore20)
	}

	cachedStore10, err := svc.GetStoreOperations(context.Background(), 10)
	if err != nil {
		t.Fatalf("Store 10 cache hit failed: %v", err)
	}
	if len(cachedStore10) != 1 || cachedStore10[0].StoreID != 10 {
		t.Fatalf("Store 10 cache leak detected: %+v", cachedStore10)
	}

	cachedStore20, err := svc.GetStoreOperations(context.Background(), 20)
	if err != nil {
		t.Fatalf("Store 20 cache hit failed: %v", err)
	}
	if len(cachedStore20) != 1 || cachedStore20[0].StoreID != 20 {
		t.Fatalf("Store 20 cache leak detected: %+v", cachedStore20)
	}
}
