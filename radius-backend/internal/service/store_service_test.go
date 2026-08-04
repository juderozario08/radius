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
			Name: "New Name",
			Province: "Ontario",
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
