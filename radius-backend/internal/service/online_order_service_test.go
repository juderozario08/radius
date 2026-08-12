package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"

	"go.uber.org/mock/gomock"
)

func TestOnlineOrderService_GetAllOnlineOrders_Admin(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)
	svc := service.NewOnlineOrderService(mockOrdersRepo, nil, nil, nil, nil, nil)

	mockOrdersRepo.EXPECT().
		GetAllOnlineOrders(gomock.Any(), 10, 0, nil, models.OrderSearchCriteria{}). // storeID should be nil for Admin
		Return([]models.OnlineOrder{
			{OrderId: 1},
		}, 1, nil)

	orders, total, err := svc.GetAllOnlineOrders(context.Background(), "admin@test.com", models.RoleAdmin, 1, 10, models.OrderSearchCriteria{})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if total != 1 {
		t.Fatalf("expected 1 total, got %d", total)
	}
	if len(orders) != 1 {
		t.Fatalf("expected 1 order, got %d", len(orders))
	}
}

func TestOnlineOrderService_GetAllOnlineOrders_Manager(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewOnlineOrderService(mockOrdersRepo, nil, nil, nil, nil, mockEmployeeRepo)

	storeId := 2

	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), "manager@test.com").
		Return(&models.Employee{
			EmployeeBase: models.EmployeeBase{
				StoreId: storeId,
			},
		}, nil)

	mockOrdersRepo.EXPECT().
		GetAllOnlineOrders(gomock.Any(), 10, 0, &storeId, models.OrderSearchCriteria{}). // storeID should be passed
		Return([]models.OnlineOrder{}, 0, nil)

	orders, total, err := svc.GetAllOnlineOrders(context.Background(), "manager@test.com", models.RoleManager, 1, 10, models.OrderSearchCriteria{})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if total != 0 {
		t.Fatalf("expected 0 total, got %d", total)
	}
	if len(orders) != 0 {
		t.Fatalf("expected 0 orders, got %d", len(orders))
	}
}
