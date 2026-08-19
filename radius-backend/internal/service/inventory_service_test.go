package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"

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

	svc := service.NewInventoryService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productRepo)

	managerEmail := "manager@test.com"
	storeId := 5

	employeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), managerEmail).
		Return(&models.Employee{
			EmployeeBase: models.EmployeeBase{
				Email:   managerEmail,
				Role:    models.RoleManager,
				StoreId: storeId,
			},
		}, nil)

	expectedAdjustments := []models.PendingAdjustmentDetail{
		{AdjustmentId: 1, ProductId: 10, PreviousQty: 5, AdjustedQty: 3, Reason: "Damage"},
		{AdjustmentId: 2, ProductId: 11, PreviousQty: 2, AdjustedQty: 0, Reason: "Shrink"},
	}

	inventoryRepo.EXPECT().
		GetPendingAdjustments(gomock.Any(), storeId).
		Return(expectedAdjustments, nil)

	res, err := svc.GetPendingAdjustments(context.Background(), managerEmail)
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

	svc := service.NewInventoryService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productRepo)

	managerEmail := "manager@test.com"
	storeId := 5
	employeeId := 99

	employeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), managerEmail).
		Return(&models.Employee{
			EmployeeId: employeeId,
			EmployeeBase: models.EmployeeBase{
				Email:   managerEmail,
				Role:    models.RoleManager,
				StoreId: storeId,
			},
		}, nil)

	req := models.ReviewAdjustmentRequest{
		Reviews: []models.ReviewAdjustmentItem{
			{AdjustmentId: 1, Status: models.AdjustmentStatusApproved},
			{AdjustmentId: 2, Status: models.AdjustmentStatusRejected},
		},
	}

	inventoryRepo.EXPECT().
		ReviewAdjustments(gomock.Any(), storeId, employeeId, req.Reviews).
		Return(nil)

	err := svc.ReviewAdjustments(context.Background(), managerEmail, req)
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

	svc := service.NewInventoryService(storeRepo, employeeRepo, sessionRepo, inventoryRepo, productRepo)

	employeeEmail := "employee@test.com"
	storeId := 5
	employeeId := 99

	employeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), employeeEmail).
		Return(&models.Employee{
			EmployeeId: employeeId,
			EmployeeBase: models.EmployeeBase{
				Email:   employeeEmail,
				Role:    models.RoleSales, // Not a manager
				StoreId: storeId,
			},
		}, nil)

	req := models.ReviewAdjustmentRequest{
		Reviews: []models.ReviewAdjustmentItem{
			{AdjustmentId: 1, Status: models.AdjustmentStatusApproved},
		},
	}

	err := svc.ReviewAdjustments(context.Background(), employeeEmail, req)
	if err == nil {
		t.Fatalf("expected error for unauthorized employee, got nil")
	}
	if err.Error() != "unauthorized" {
		t.Fatalf("expected 'unauthorized' error, got %v", err)
	}
}
