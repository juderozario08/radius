package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"
	"time"

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

func TestOnlineOrderService_CreateOnlineOrder_BroadcastsEvent(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)
	mockBroadcaster := mocks.NewMockEventBroadcaster(ctrl)

	svc := service.NewOnlineOrderService(mockOrdersRepo, nil, nil, nil, nil, nil, mockBroadcaster)

	storeID := 2
	orderID := 5001
	placedAt := time.Now().UTC()

	inputOrder := &models.OnlineOrder{
		StoreId:       storeID,
		CustomerName:  "Jane Smith",
		CustomerEmail: "jane@example.com",
		OrderType:     models.OnlineOrderTypeBOPIS,
		Status:        models.OnlineOrderStatusReadyForPickup,
		Items: []models.OnlineOrderItem{
			{ProductId: 10, Quantity: 2, UnitPrice: 25.00},
		},
	}

	expectedSavedOrder := *inputOrder
	expectedSavedOrder.OrderId = orderID
	expectedSavedOrder.PlacedAt = placedAt
	expectedSavedOrder.Subtotal = 50.00
	expectedSavedOrder.TotalAmount = 50.00
	expectedSavedOrder.Items[0].OrderItemId = 501
	expectedSavedOrder.Items[0].OrderId = orderID

	mockOrdersRepo.EXPECT().
		CreateOnlineOrder(gomock.Any(), gomock.Any()).
		Return(&expectedSavedOrder, nil)

	// Verify that BroadcastToStore is called with storeID 2 and matching event payload
	mockBroadcaster.EXPECT().
		BroadcastToStore(storeID, gomock.Cond(func(x any) bool {
			evt, ok := x.(models.WebSocketEvent)
			if !ok {
				return false
			}
			if evt.Type != models.EventOrderCreated || evt.StoreId != storeID {
				return false
			}
			payload, ok := evt.Payload.(models.OrderCreatedPayload)
			if !ok {
				return false
			}
			return payload.OrderId == orderID &&
				payload.StoreId == storeID &&
				payload.CustomerName == "Jane Smith" &&
				payload.CustomerEmail == "jane@example.com" &&
				payload.TotalAmount == 50.00 &&
				payload.ItemsCount == 2 &&
				payload.Status == models.OnlineOrderStatusReadyForPickup
		})).
		Times(1)

	created, err := svc.CreateOnlineOrder(context.Background(), "sales@store2.com", models.RoleSales, inputOrder)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if created.OrderId != orderID {
		t.Fatalf("expected order ID %d, got %d", orderID, created.OrderId)
	}
}

func TestOnlineOrderService_CreateOnlineOrder_InvalidStatus(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	svc := service.NewOnlineOrderService(nil, nil, nil, nil, nil, nil)

	inputOrder := &models.OnlineOrder{
		StoreId:   2,
		OrderType: models.OnlineOrderTypeBOPIS,
		Status:    models.OnlineOrderStatusShipped, // Invalid for BOPIS!
	}

	_, err := svc.CreateOnlineOrder(context.Background(), "sales@store2.com", models.RoleSales, inputOrder)
	if err == nil {
		t.Fatal("expected error for invalid BOPIS status, got nil")
	}
}

func TestOnlineOrderService_CreateOnlineOrder_NilBroadcasterSafe(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)

	// No broadcaster supplied
	svc := service.NewOnlineOrderService(mockOrdersRepo, nil, nil, nil, nil, nil)

	storeID := 2
	orderID := 5002

	inputOrder := &models.OnlineOrder{
		StoreId:       storeID,
		CustomerName:  "Bob Builder",
		CustomerEmail: "bob@example.com",
		OrderType:     models.OnlineOrderTypeBOPIS,
		Status:        models.OnlineOrderStatusReadyForPickup,
		TotalAmount:   89.50,
	}

	mockOrdersRepo.EXPECT().
		CreateOnlineOrder(gomock.Any(), gomock.Any()).
		Return(&models.OnlineOrder{
			OrderId:       orderID,
			StoreId:       storeID,
			CustomerName:  "Bob Builder",
			CustomerEmail: "bob@example.com",
			OrderType:     models.OnlineOrderTypeBOPIS,
			Status:        models.OnlineOrderStatusReadyForPickup,
			TotalAmount:   89.50,
		}, nil)

	created, err := svc.CreateOnlineOrder(context.Background(), "sales@store2.com", models.RoleSales, inputOrder)
	if err != nil {
		t.Fatalf("expected success with nil broadcaster, got %v", err)
	}
	if created.OrderId != orderID {
		t.Fatalf("expected order ID %d, got %d", orderID, created.OrderId)
	}
}
