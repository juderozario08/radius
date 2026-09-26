package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"

	"go.uber.org/mock/gomock"
)

func TestPrintOrderService_GetAllPrintOrders_Admin(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)
	svc := service.NewPrintOrderService(mockOrdersRepo, nil)

	mockOrdersRepo.EXPECT().
		GetAllPrintOrders(gomock.Any(), 10, 0, nil, models.PrintOrderSearchCriteria{}).
		Return([]models.PrintOrder{
			{PrintOrderId: 1, OrderType: models.PrintOrderTypeWeb},
		}, 1, nil)

	orders, total, err := svc.GetAllPrintOrders(context.Background(), 1, models.RoleAdmin, 1, 10, models.PrintOrderSearchCriteria{})
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

func TestPrintOrderService_GetAllPrintOrders_NonAdmin(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewPrintOrderService(mockOrdersRepo, mockEmployeeRepo)

	storeId := 2

	mockOrdersRepo.EXPECT().
		GetAllPrintOrders(gomock.Any(), 10, 0, &storeId, models.PrintOrderSearchCriteria{}).
		Return([]models.PrintOrder{
			{PrintOrderId: 2, StoreId: storeId, OrderType: models.PrintOrderTypeWalkIn},
		}, 1, nil)

	orders, total, err := svc.GetAllPrintOrders(context.Background(), storeId, models.RoleService, 1, 10, models.PrintOrderSearchCriteria{})
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

func TestPrintOrderService_GetPrintOrderByID(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)
	svc := service.NewPrintOrderService(mockOrdersRepo, nil)

	orderID := 1
	mockOrdersRepo.EXPECT().
		GetPrintOrderByID(gomock.Any(), orderID, nil).
		Return(&models.PrintOrder{
			PrintOrderId: orderID,
			CustomerName: "Test Customer",
		}, []models.PrintOrderItem{
			{PrintOrderItemId: 1, Description: "Business Cards"},
		}, nil)

	order, items, err := svc.GetPrintOrderByID(context.Background(), orderID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if order == nil || order.PrintOrderId != orderID {
		t.Fatalf("expected order with ID %d", orderID)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
}
