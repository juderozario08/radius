// radius-backend/internal/service/online_order_service.go
package service

import (
	"context"
	"fmt"
	"radius/internal/models"
	"time"
)

type OnlineOrderService struct {
	ordersRepo    OrdersRepository
	productsRepo  ProductRepository
	inventoryRepo InventoryRepository
	sessionRepo   SessionRepository
	storeRepo     StoreRepository
	employeeRepo  EmployeeRepository
	broadcaster   EventBroadcaster
}

func NewOnlineOrderService(
	ordersRepo OrdersRepository,
	productsRepo ProductRepository,
	inventoryRepo InventoryRepository,
	sessionRepo SessionRepository,
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	broadcaster ...EventBroadcaster,
) *OnlineOrderService {
	svc := &OnlineOrderService{
		ordersRepo:    ordersRepo,
		productsRepo:  productsRepo,
		inventoryRepo: inventoryRepo,
		sessionRepo:   sessionRepo,
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
	}
	if len(broadcaster) > 0 && broadcaster[0] != nil {
		svc.broadcaster = broadcaster[0]
	}
	return svc
}

// SetBroadcaster allows setting or replacing the real-time event broadcaster.
func (s *OnlineOrderService) SetBroadcaster(broadcaster EventBroadcaster) {
	s.broadcaster = broadcaster
}

func (s *OnlineOrderService) GetAllOnlineOrders(ctx context.Context, email string, role models.EmployeeRole, page, limit int, criteria models.OrderSearchCriteria) ([]models.OnlineOrder, int, error) {
	isTargetedSearch := criteria.OrderID != nil ||
		criteria.CustomerFirstName != "" ||
		criteria.CustomerLastName != "" ||
		criteria.CustomerEmail != "" ||
		criteria.BillingPhone != "" ||
		criteria.PaymentCard != "" ||
		criteria.SKU != ""

	var storeID *int
	if role != models.RoleAdmin && !isTargetedSearch {
		emp, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
		if err != nil {
			return nil, 0, err
		}
		storeID = &emp.StoreId
	}

	offset := (page - 1) * limit
	return s.ordersRepo.GetAllOnlineOrders(ctx, limit, offset, storeID, criteria)
}

func (s *OnlineOrderService) GetOnlineOrderByID(ctx context.Context, email string, role models.EmployeeRole, id int) (*models.OnlineOrder, []models.OnlineOrderItem, error) {
	// Since employees can search for orders globally, they can view them globally.
	return s.ordersRepo.GetOnlineOrderByID(ctx, id, nil)
}

// AssignOnlineOrder assigns an online order to an employee.
// If the order is already assigned to a different employee and force is false (e.g. non-manager associate),
// it returns the current order and false indicating conflict ("already assigned to someone else").
// When successfully assigned, it broadcasts EventOrderStatusUpdated and EventStoreActivity over WebSocket.
func (s *OnlineOrderService) AssignOnlineOrder(ctx context.Context, email string, role models.EmployeeRole, orderID int, employeeID *int) (*models.OnlineOrder, bool, error) {
	var currentEmp *models.Employee
	if email != "" && s.employeeRepo != nil {
		emp, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
		if err == nil {
			currentEmp = emp
		}
	}

	targetEmpID := employeeID
	if targetEmpID == nil && currentEmp != nil {
		targetEmpID = &currentEmp.EmployeeId
	}

	force := role == models.RoleAdmin || role == models.RoleManager

	var storeID *int
	if role != models.RoleAdmin && currentEmp != nil {
		storeID = &currentEmp.StoreId
	}

	order, wasAssigned, err := s.ordersRepo.AssignOnlineOrder(ctx, orderID, targetEmpID, storeID, force)
	if err != nil {
		return nil, false, err
	}

	if wasAssigned && s.broadcaster != nil && order != nil {
		s.broadcaster.BroadcastToStore(order.StoreId, models.WebSocketEvent{
			Type:      models.EventOrderStatusUpdated,
			StoreId:   order.StoreId,
			Timestamp: time.Now().UTC(),
			Payload: models.OrderStatusUpdatedPayload{
				OrderId:        order.OrderId,
				StoreId:        order.StoreId,
				CustomerName:   order.CustomerName,
				OrderType:      order.OrderType,
				PreviousStatus: order.Status,
				NewStatus:      order.Status,
				TotalAmount:    float64(order.TotalAmount),
				UpdatedAt:      time.Now().UTC(),
				AssignedTo:     order.AssignedTo,
				AssignedToName: order.AssignedToName,
			},
		})

		assigneeName := "an associate"
		if order.AssignedToName != nil && *order.AssignedToName != "" {
			assigneeName = *order.AssignedToName
		}
		s.broadcaster.BroadcastToStore(order.StoreId, models.WebSocketEvent{
			Type:      models.EventStoreActivity,
			StoreId:   order.StoreId,
			Timestamp: time.Now().UTC(),
			Payload: models.StoreActivityPayload{
				ActivityId:   fmt.Sprintf("act-assign-%d-%d", order.OrderId, time.Now().UnixMilli()),
				StoreId:      order.StoreId,
				ActivityType: "ORDER_ASSIGNED",
				Title:        fmt.Sprintf("Order #%d Claimed", order.OrderId),
				Description:  fmt.Sprintf("%s is working on Order #%d (%s)", assigneeName, order.OrderId, order.OrderType),
				Timestamp:    time.Now().UTC(),
				Metadata: map[string]any{
					"order_id":         order.OrderId,
					"assigned_to":      order.AssignedTo,
					"assigned_to_name": order.AssignedToName,
				},
			},
		})
	}

	return order, wasAssigned, nil
}


// CreateOnlineOrder validates, computes totals, persists the order, and broadcasts an EventOrderCreated WebSocket frame.
func (s *OnlineOrderService) CreateOnlineOrder(ctx context.Context, email string, role models.EmployeeRole, order *models.OnlineOrder) (*models.OnlineOrder, error) {
	if order == nil {
		return nil, fmt.Errorf("order cannot be nil")
	}

	// 1. Resolve store ID
	if order.StoreId <= 0 {
		if email != "" && s.employeeRepo != nil {
			emp, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
			if err == nil && emp != nil {
				order.StoreId = emp.StoreId
			}
		}
	}
	if order.StoreId <= 0 {
		return nil, fmt.Errorf("store ID is required to create an online order")
	}

	// 2. Set defaults
	if order.OrderType == "" {
		order.OrderType = models.OnlineOrderTypeBOPIS
	}
	if order.Status == "" {
		switch order.OrderType {
		case models.OnlineOrderTypeBOPIS:
			order.Status = models.OnlineOrderStatusReadyForPickup
		default:
			order.Status = models.OnlineOrderStatusWorkInProgress
		}
	}
	if order.ShippingAddress == "" {
		if order.OrderType == models.OnlineOrderTypeBOPIS {
			order.ShippingAddress = "Store Pickup Counter"
		} else {
			order.ShippingAddress = "Store Pickup"
		}
	}
	if order.CustomerName == "" && order.CustomerEmail != "" {
		order.CustomerName = order.CustomerEmail
	}

	// 3. Validate status against order type
	if err := order.ValidateStatus(); err != nil {
		return nil, err
	}

	// 4. Calculate items count and totals
	itemsCount := 0
	for i := range order.Items {
		if order.Items[i].Quantity <= 0 {
			order.Items[i].Quantity = 1
		}
		itemsCount += order.Items[i].Quantity
	}
	if itemsCount == 0 && len(order.Items) > 0 {
		itemsCount = len(order.Items)
	}

	if order.Subtotal == 0 && len(order.Items) > 0 {
		var subtotal float32
		for _, it := range order.Items {
			subtotal += float32(it.Quantity) * it.UnitPrice
		}
		order.Subtotal = subtotal
	}
	if order.TotalAmount == 0 {
		order.TotalAmount = order.Subtotal + order.TaxAmount + order.ShippingFee
	}

	// 5. Persist order and items in PostgreSQL
	createdOrder, err := s.ordersRepo.CreateOnlineOrder(ctx, order)
	if err != nil {
		return nil, err
	}

	// 6. Broadcast real-time WebSocket event (R2, AC1)
	if s.broadcaster != nil {
		placedAt := createdOrder.PlacedAt
		if placedAt.IsZero() {
			placedAt = time.Now().UTC()
		}

		payload := models.OrderCreatedPayload{
			OrderId:       createdOrder.OrderId,
			StoreId:       createdOrder.StoreId,
			CustomerName:  createdOrder.CustomerName,
			CustomerEmail: createdOrder.CustomerEmail,
			OrderType:     createdOrder.OrderType,
			Status:        createdOrder.Status,
			TotalAmount:   float64(createdOrder.TotalAmount),
			ItemsCount:    itemsCount,
			PlacedAt:      placedAt,
		}

		event := models.WebSocketEvent{
			Type:      models.EventOrderCreated,
			StoreId:   createdOrder.StoreId,
			Timestamp: time.Now().UTC(),
			Payload:   payload,
		}

		s.broadcaster.BroadcastToStore(createdOrder.StoreId, event)
	}

	return createdOrder, nil
}

// UpdateOrderItem updates the picked quantity, status, and reason for an order item.
func (s *OnlineOrderService) UpdateOrderItem(ctx context.Context, email string, role models.EmployeeRole, orderID, itemID int, pickedQty *int, status string, reason *string) error {
	return s.ordersRepo.UpdateOnlineOrderItem(ctx, orderID, itemID, pickedQty, status, reason)
}

// CompleteOrderPicking updates the order status to AWAITING PICKUP and broadcasts real-time events.
func (s *OnlineOrderService) CompleteOrderPicking(ctx context.Context, email string, role models.EmployeeRole, orderID int) (*models.OnlineOrder, error) {
	updatedOrder, err := s.ordersRepo.UpdateOnlineOrderStatus(ctx, orderID, models.OnlineOrderStatusAwaitingPickup, nil)
	if err != nil {
		return nil, err
	}

	if s.broadcaster != nil && updatedOrder != nil {
		s.broadcaster.BroadcastToStore(updatedOrder.StoreId, models.WebSocketEvent{
			Type:      models.EventOrderStatusUpdated,
			StoreId:   updatedOrder.StoreId,
			Timestamp: time.Now().UTC(),
			Payload: models.OrderStatusUpdatedPayload{
				OrderId:        updatedOrder.OrderId,
				StoreId:        updatedOrder.StoreId,
				CustomerName:   updatedOrder.CustomerName,
				OrderType:      updatedOrder.OrderType,
				PreviousStatus: models.OnlineOrderStatusWorkInProgress,
				NewStatus:      updatedOrder.Status,
				TotalAmount:    float64(updatedOrder.TotalAmount),
				UpdatedAt:      time.Now().UTC(),
				AssignedTo:     updatedOrder.AssignedTo,
				AssignedToName: updatedOrder.AssignedToName,
			},
		})

		s.broadcaster.BroadcastToStore(updatedOrder.StoreId, models.WebSocketEvent{
			Type:      models.EventStoreActivity,
			StoreId:   updatedOrder.StoreId,
			Timestamp: time.Now().UTC(),
			Payload: models.StoreActivityPayload{
				ActivityId:   fmt.Sprintf("act-picked-%d-%d", updatedOrder.OrderId, time.Now().UnixMilli()),
				StoreId:      updatedOrder.StoreId,
				ActivityType: "ORDER_PICKED",
				Title:        fmt.Sprintf("Order #%d Picked", updatedOrder.OrderId),
				Description:  fmt.Sprintf("Order #%d picking completed. Awaiting customer pickup.", updatedOrder.OrderId),
				Timestamp:    time.Now().UTC(),
				Metadata: map[string]any{
					"order_id": updatedOrder.OrderId,
					"status":   updatedOrder.Status,
				},
			},
		})
	}

	return updatedOrder, nil
}

// CancelOnlineOrder cancels an order with a specified reason and broadcasts real-time events.
func (s *OnlineOrderService) CancelOnlineOrder(ctx context.Context, email string, role models.EmployeeRole, orderID int, reason string) (*models.OnlineOrder, error) {
	if reason == "" {
		return nil, fmt.Errorf("cancellation reason is required")
	}

	updatedOrder, err := s.ordersRepo.UpdateOnlineOrderStatus(ctx, orderID, models.OnlineOrderStatusCancelled, &reason)
	if err != nil {
		return nil, err
	}

	if s.broadcaster != nil && updatedOrder != nil {
		s.broadcaster.BroadcastToStore(updatedOrder.StoreId, models.WebSocketEvent{
			Type:      models.EventOrderStatusUpdated,
			StoreId:   updatedOrder.StoreId,
			Timestamp: time.Now().UTC(),
			Payload: models.OrderStatusUpdatedPayload{
				OrderId:        updatedOrder.OrderId,
				StoreId:        updatedOrder.StoreId,
				CustomerName:   updatedOrder.CustomerName,
				OrderType:      updatedOrder.OrderType,
				PreviousStatus: models.OnlineOrderStatusWorkInProgress,
				NewStatus:      models.OnlineOrderStatusCancelled,
				TotalAmount:    float64(updatedOrder.TotalAmount),
				UpdatedAt:      time.Now().UTC(),
				AssignedTo:     updatedOrder.AssignedTo,
				AssignedToName: updatedOrder.AssignedToName,
			},
		})

		s.broadcaster.BroadcastToStore(updatedOrder.StoreId, models.WebSocketEvent{
			Type:      models.EventStoreActivity,
			StoreId:   updatedOrder.StoreId,
			Timestamp: time.Now().UTC(),
			Payload: models.StoreActivityPayload{
				ActivityId:   fmt.Sprintf("act-cancel-%d-%d", updatedOrder.OrderId, time.Now().UnixMilli()),
				StoreId:      updatedOrder.StoreId,
				ActivityType: "ORDER_CANCELLED",
				Title:        fmt.Sprintf("Order #%d Cancelled", updatedOrder.OrderId),
				Description:  fmt.Sprintf("Order #%d was cancelled. Reason: %s", updatedOrder.OrderId, reason),
				Timestamp:    time.Now().UTC(),
				Metadata: map[string]any{
					"order_id": updatedOrder.OrderId,
					"reason":   reason,
				},
			},
		})
	}

	return updatedOrder, nil
}

// AutoCancelExpiredBOPISOrders finds and cancels BOPIS orders waiting > 5 days.
func (s *OnlineOrderService) AutoCancelExpiredBOPISOrders(ctx context.Context) (int, error) {
	cancelled, err := s.ordersRepo.AutoCancelExpiredBOPISOrders(ctx, 5*24*time.Hour)
	if err != nil {
		return 0, err
	}

	if s.broadcaster != nil {
		for _, o := range cancelled {
			s.broadcaster.BroadcastToStore(o.StoreId, models.WebSocketEvent{
				Type:      models.EventOrderStatusUpdated,
				StoreId:   o.StoreId,
				Timestamp: time.Now().UTC(),
				Payload: models.OrderStatusUpdatedPayload{
					OrderId:      o.OrderId,
					StoreId:      o.StoreId,
					CustomerName: o.CustomerName,
					OrderType:    o.OrderType,
					NewStatus:    models.OnlineOrderStatusCancelled,
					TotalAmount:  float64(o.TotalAmount),
					UpdatedAt:    time.Now().UTC(),
				},
			})
		}
	}

	return len(cancelled), nil
}

// StartBOPISAutoCancelWorker periodically runs auto-cancellation in the background.
func (s *OnlineOrderService) StartBOPISAutoCancelWorker(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				return
			case <-ticker.C:
				_, _ = s.AutoCancelExpiredBOPISOrders(context.Background())
			}
		}
	}()
}

