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

