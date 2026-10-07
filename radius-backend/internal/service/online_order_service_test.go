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
		GetAllOnlineOrders(gomock.Any(), 10, 0, nil, models.OrderSearchCriteria{}).
		Return([]models.OnlineOrder{
			{OrderId: 1},
		}, 1, nil)

	orders, total, err := svc.GetAllOnlineOrders(context.Background(), 1, models.RoleAdmin, 1, 10, models.OrderSearchCriteria{})
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
	svc := service.NewOnlineOrderService(mockOrdersRepo, nil, nil, nil, nil, nil)

	storeId := 2

	mockOrdersRepo.EXPECT().
		GetAllOnlineOrders(gomock.Any(), 10, 0, &storeId, models.OrderSearchCriteria{}).
		Return([]models.OnlineOrder{}, 0, nil)

	orders, total, err := svc.GetAllOnlineOrders(context.Background(), storeId, models.RoleManager, 1, 10, models.OrderSearchCriteria{})
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

func TestOnlineOrderService_TargetedSearchStaysInStore(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := mocks.NewMockOrdersRepository(ctrl)
	svc := service.NewOnlineOrderService(repo, nil, nil, nil, nil, nil)
	storeID := 2
	orderID := 42
	criteria := models.OrderSearchCriteria{OrderID: &orderID, CustomerEmail: "customer@example.invalid"}
	repo.EXPECT().GetAllOnlineOrders(gomock.Any(), 10, 0, &storeID, criteria).Return([]models.OnlineOrder{}, 0, nil)
	if _, _, err := svc.GetAllOnlineOrders(context.Background(), storeID, models.RoleSales, 1, 10, criteria); err != nil {
		t.Fatal(err)
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

	created, err := svc.CreateOnlineOrder(context.Background(), 2, models.RoleSales, inputOrder)
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
		Status:    models.OnlineOrderStatusShipped,
	}

	_, err := svc.CreateOnlineOrder(context.Background(), 2, models.RoleSales, inputOrder)
	if err == nil {
		t.Fatal("expected error for invalid BOPIS status, got nil")
	}
}

func TestOnlineOrderService_CreateOnlineOrder_NilBroadcasterSafe(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)

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

	created, err := svc.CreateOnlineOrder(context.Background(), storeID, models.RoleSales, inputOrder)
	if err != nil {
		t.Fatalf("expected success with nil broadcaster, got %v", err)
	}
	if created.OrderId != orderID {
		t.Fatalf("expected order ID %d, got %d", orderID, created.OrderId)
	}
}

func TestOnlineOrderService_AssignOnlineOrder(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewOnlineOrderService(mockOrdersRepo, nil, nil, nil, nil, mockEmployeeRepo)

	orderID := 101
	empID := 5
	storeID := 2
	empName := "Marcus Vance"

	mockOrdersRepo.EXPECT().
		AssignOnlineOrder(gomock.Any(), orderID, &empID, &storeID, false).
		Return(&models.OnlineOrder{
			OrderId:        orderID,
			StoreId:        storeID,
			AssignedTo:     &empID,
			AssignedToName: &empName,
		}, true, nil)

	order, wasAssigned, err := svc.AssignOnlineOrder(context.Background(), storeID, empID, models.RoleSales, orderID, &empID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !wasAssigned {
		t.Fatalf("expected wasAssigned to be true")
	}
	if order.AssignedTo == nil || *order.AssignedTo != empID {
		t.Fatalf("expected assigned_to to be %d", empID)
	}

	otherEmpID := 8
	otherEmpName := "Sarah Jenkins"

	mockOrdersRepo.EXPECT().
		AssignOnlineOrder(gomock.Any(), orderID, &otherEmpID, &storeID, false).
		Return(&models.OnlineOrder{
			OrderId:        orderID,
			StoreId:        storeID,
			AssignedTo:     &empID,
			AssignedToName: &otherEmpName,
		}, false, nil)

	conflictOrder, wasAssigned2, err := svc.AssignOnlineOrder(context.Background(), storeID, otherEmpID, models.RoleSales, orderID, &otherEmpID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if wasAssigned2 {
		t.Fatalf("expected wasAssigned to be false for conflict")
	}
	if conflictOrder.AssignedTo == nil || *conflictOrder.AssignedTo != empID {
		t.Fatalf("expected conflictOrder.AssignedTo to be %d, got %v", empID, conflictOrder.AssignedTo)
	}
}

func TestOnlineOrderService_AssignOnlineOrder_Admin(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewOnlineOrderService(mockOrdersRepo, nil, nil, nil, nil, mockEmployeeRepo)

	orderID := 101
	adminID := 1
	targetEmpID := 5

	_, _, err := svc.AssignOnlineOrder(context.Background(), 1, adminID, models.RoleAdmin, orderID, nil)
	if err == nil {
		t.Fatalf("expected error when admin assigns with nil employeeID")
	}

	empName := "Store Associate"
	mockOrdersRepo.EXPECT().
		AssignOnlineOrder(gomock.Any(), orderID, &targetEmpID, (*int)(nil), true).
		Return(&models.OnlineOrder{
			OrderId:        orderID,
			StoreId:        2,
			AssignedTo:     &targetEmpID,
			AssignedToName: &empName,
		}, true, nil)

	order, wasAssigned, err := svc.AssignOnlineOrder(context.Background(), 1, adminID, models.RoleAdmin, orderID, &targetEmpID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !wasAssigned || order.AssignedTo == nil || *order.AssignedTo != targetEmpID {
		t.Fatalf("expected order assigned to %d", targetEmpID)
	}
}

func TestOnlineOrderService_UpdateOrderItem(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)
	svc := service.NewOnlineOrderService(mockOrdersRepo, nil, nil, nil, nil, nil)

	pickedQty := 3
	status := "ACTIVE"
	reason := "NONE"

	mockOrdersRepo.EXPECT().
		UpdateOnlineOrderItem(gomock.Any(), 100, 200, &pickedQty, status, &reason).
		Return(nil)

	err := svc.UpdateOrderItem(context.Background(), "emp@test.com", models.RoleSales, 100, 200, &pickedQty, status, &reason)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestOnlineOrderService_CompleteOrderPicking(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)
	svc := service.NewOnlineOrderService(mockOrdersRepo, nil, nil, nil, nil, nil)

	mockOrdersRepo.EXPECT().
		UpdateOnlineOrderStatus(gomock.Any(), 100, models.OnlineOrderStatusAwaitingPickup, nil).
		Return(&models.OnlineOrder{
			OrderId: 100,
			StoreId: 1,
			Status:  models.OnlineOrderStatusAwaitingPickup,
		}, nil)

	order, err := svc.CompleteOrderPicking(context.Background(), "emp@test.com", models.RoleSales, 100)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if order.Status != models.OnlineOrderStatusAwaitingPickup {
		t.Fatalf("expected status %s, got %s", models.OnlineOrderStatusAwaitingPickup, order.Status)
	}
}

func TestOnlineOrderService_CancelOnlineOrder(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)
	svc := service.NewOnlineOrderService(mockOrdersRepo, nil, nil, nil, nil, nil)

	reason := "Customer Requested Cancellation"
	mockOrdersRepo.EXPECT().
		UpdateOnlineOrderStatus(gomock.Any(), 100, models.OnlineOrderStatusCancelled, &reason).
		Return(&models.OnlineOrder{
			OrderId:            100,
			StoreId:            1,
			Status:             models.OnlineOrderStatusCancelled,
			CancellationReason: &reason,
		}, nil)

	order, err := svc.CancelOnlineOrder(context.Background(), "emp@test.com", models.RoleSales, 100, reason)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if order.Status != models.OnlineOrderStatusCancelled {
		t.Fatalf("expected status %s, got %s", models.OnlineOrderStatusCancelled, order.Status)
	}
}

func TestOnlineOrderService_AutoCancelExpiredBOPISOrders(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockOrdersRepo := mocks.NewMockOrdersRepository(ctrl)
	svc := service.NewOnlineOrderService(mockOrdersRepo, nil, nil, nil, nil, nil)

	mockOrdersRepo.EXPECT().
		AutoCancelExpiredBOPISOrders(gomock.Any(), 5*24*time.Hour).
		Return([]models.OnlineOrder{
			{OrderId: 101, StoreId: 1, Status: models.OnlineOrderStatusCancelled},
			{OrderId: 102, StoreId: 1, Status: models.OnlineOrderStatusCancelled},
		}, nil)

	count, err := svc.AutoCancelExpiredBOPISOrders(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if count != 2 {
		t.Fatalf("expected 2 cancelled orders, got %d", count)
	}
}
