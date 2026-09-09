package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"

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
