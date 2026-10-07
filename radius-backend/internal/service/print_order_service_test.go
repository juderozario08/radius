package service_test

import (
	"context"
	"errors"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"

	"go.uber.org/mock/gomock"
)

func TestPrintOrderService_UpdateStatus(t *testing.T) {
	tests := []struct {
		name    string
		role    models.EmployeeRole
		current models.PrintOrderStatus
		next    models.PrintOrderStatus
		found   bool
		updated bool
		wantErr error
	}{
		{"pending to production", models.RoleService, models.PrintOrderStatusPending, models.PrintOrderStatusInProgress, true, true, nil},
		{"production to pickup", models.RoleManager, models.PrintOrderStatusInProgress, models.PrintOrderStatusReadyForPickup, true, true, nil},
		{"shipped to complete", models.RoleAdmin, models.PrintOrderStatusShipped, models.PrintOrderStatusCompleted, true, true, nil},
		{"sales forbidden", models.RoleSales, models.PrintOrderStatusPending, models.PrintOrderStatusInProgress, true, false, service.ErrForbidden},
		{"other store", models.RoleService, models.PrintOrderStatusPending, models.PrintOrderStatusInProgress, false, false, service.ErrNotFound},
		{"skip production", models.RoleService, models.PrintOrderStatusPending, models.PrintOrderStatusCompleted, true, false, service.ErrConflict},
		{"stale update", models.RoleService, models.PrintOrderStatusPending, models.PrintOrderStatusInProgress, true, false, service.ErrConflict},
		{"terminal", models.RoleService, models.PrintOrderStatusCancelled, models.PrintOrderStatusInProgress, true, false, service.ErrConflict},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			repo := mocks.NewMockOrdersRepository(ctrl)
			svc := service.NewPrintOrderService(repo, nil)
			if tt.role != models.RoleSales {
				var order *models.PrintOrder
				if tt.found {
					order = &models.PrintOrder{PrintOrderId: 7, StoreId: 2, Status: tt.current}
				}
				var scope *int
				if tt.role != models.RoleAdmin {
					storeID := 2
					scope = &storeID
				}
				repo.EXPECT().GetPrintOrderByID(gomock.Any(), 7, scope).Return(order, nil, nil)
				if tt.found && (tt.wantErr == nil || tt.name == "stale update") {
					repo.EXPECT().UpdatePrintOrderStatus(gomock.Any(), 7, 2, tt.current, tt.next).Return(tt.updated, nil)
				}
			}
			result, err := svc.UpdateStatus(context.Background(), 7, 2, tt.role, tt.next)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("got error %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr == nil && (result == nil || result.Status != tt.next) {
				t.Fatalf("unexpected result: %+v", result)
			}
		})
	}
}

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
