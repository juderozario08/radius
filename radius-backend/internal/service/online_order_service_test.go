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

	// Case 1: Successful assignment by associate
	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), "sales@test.com").
		Return(&models.Employee{
			EmployeeId: empID,
			EmployeeBase: models.EmployeeBase{
				StoreId:   storeID,
				FirstName: "Marcus",
				LastName:  "Vance",
			},
		}, nil)

	mockOrdersRepo.EXPECT().
		AssignOnlineOrder(gomock.Any(), orderID, &empID, &storeID, false).
		Return(&models.OnlineOrder{
			OrderId:        orderID,
			StoreId:        storeID,
			AssignedTo:     &empID,
			AssignedToName: &empName,
		}, true, nil)

	order, wasAssigned, err := svc.AssignOnlineOrder(context.Background(), "sales@test.com", models.RoleSales, orderID, &empID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !wasAssigned {
		t.Fatalf("expected wasAssigned to be true")
	}
	if order.AssignedTo == nil || *order.AssignedTo != empID {
		t.Fatalf("expected assigned_to to be %d", empID)
	}

	// Case 2: Conflict when order already assigned to another employee
	otherEmpID := 8
	otherEmpName := "Sarah Jenkins"
	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), "sales2@test.com").
		Return(&models.Employee{
			EmployeeId: otherEmpID,
			EmployeeBase: models.EmployeeBase{
				StoreId: storeID,
			},
		}, nil)

	mockOrdersRepo.EXPECT().
		AssignOnlineOrder(gomock.Any(), orderID, &otherEmpID, &storeID, false).
		Return(&models.OnlineOrder{
			OrderId:        orderID,
			StoreId:        storeID,
			AssignedTo:     &empID,
			AssignedToName: &otherEmpName,
		}, false, nil)

	conflictOrder, wasAssigned2, err := svc.AssignOnlineOrder(context.Background(), "sales2@test.com", models.RoleSales, orderID, &otherEmpID)
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


