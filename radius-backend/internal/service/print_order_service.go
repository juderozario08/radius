package service

import (
	"context"
	"radius/internal/models"
	"time"
)

type PrintOrderService struct {
	ordersRepo   OrdersRepository
	employeeRepo EmployeeRepository
	broadcaster  EventBroadcaster
}

func NewPrintOrderService(
	ordersRepo OrdersRepository,
	employeeRepo EmployeeRepository,
) *PrintOrderService {
	return &PrintOrderService{
		ordersRepo:   ordersRepo,
		employeeRepo: employeeRepo,
	}
}

func (s *PrintOrderService) GetAllPrintOrders(ctx context.Context, storeId int, role models.EmployeeRole, page, limit int, criteria models.PrintOrderSearchCriteria) ([]models.PrintOrder, int, error) {
	isTargetedSearch := criteria.OrderID != nil ||
		criteria.CustomerName != "" ||
		criteria.CustomerEmail != "" ||
		criteria.CustomerPhone != ""

	var storeID *int
	if role != models.RoleAdmin && !isTargetedSearch {
		storeID = &storeId
	}

	offset := (page - 1) * limit
	return s.ordersRepo.GetAllPrintOrders(ctx, limit, offset, storeID, criteria)
}

func (s *PrintOrderService) GetPrintOrderByID(ctx context.Context, id int) (*models.PrintOrder, []models.PrintOrderItem, error) {
	return s.ordersRepo.GetPrintOrderByID(ctx, id, nil)
}

func (s *PrintOrderService) GetPrintOrderByIDForStore(ctx context.Context, id, storeID int, role models.EmployeeRole) (*models.PrintOrder, []models.PrintOrderItem, error) {
	var scope *int
	if role != models.RoleAdmin {
		scope = &storeID
	}
	return s.ordersRepo.GetPrintOrderByID(ctx, id, scope)
}

func (s *PrintOrderService) SetBroadcaster(broadcaster EventBroadcaster) {
	s.broadcaster = broadcaster
}

func (s *PrintOrderService) UpdateStatus(ctx context.Context, id, storeID int, role models.EmployeeRole, next models.PrintOrderStatus) (*models.PrintOrder, error) {
	if role != models.RoleService && role != models.RoleManager && role != models.RoleAdmin {
		return nil, ErrForbidden
	}
	allowed := map[models.PrintOrderStatus][]models.PrintOrderStatus{
		models.PrintOrderStatusPending:        {models.PrintOrderStatusInProgress, models.PrintOrderStatusCancelled},
		models.PrintOrderStatusInProgress:     {models.PrintOrderStatusReadyForPickup, models.PrintOrderStatusShipped, models.PrintOrderStatusCancelled},
		models.PrintOrderStatusReadyForPickup: {models.PrintOrderStatusCompleted, models.PrintOrderStatusCancelled},
		models.PrintOrderStatusShipped:        {models.PrintOrderStatusCompleted, models.PrintOrderStatusCancelled},
	}
	order, _, err := s.GetPrintOrderByIDForStore(ctx, id, storeID, role)
	if err != nil {
		return nil, err
	}
	if order == nil {
		return nil, ErrNotFound
	}
	valid := false
	for _, status := range allowed[order.Status] {
		if status == next {
			valid = true
			break
		}
	}
	if !valid {
		return nil, ErrConflict
	}
	updated, err := s.ordersRepo.UpdatePrintOrderStatus(ctx, id, order.StoreId, order.Status, next)
	if err != nil {
		return nil, err
	}
	if !updated {
		return nil, ErrConflict
	}
	previous := order.Status
	order.Status = next
	if next == models.PrintOrderStatusCompleted {
		now := time.Now()
		order.FulfilledAt = &now
	}
	if s.broadcaster != nil {
		s.broadcaster.BroadcastToStore(order.StoreId, models.WebSocketEvent{
			Type: models.EventPrintOrderStatusUpdated, StoreId: order.StoreId, Timestamp: time.Now(),
			Payload: models.PrintOrderStatusUpdatedPayload{PrintOrderID: id, StoreID: order.StoreId, PreviousStatus: previous, NewStatus: next},
		})
	}
	return order, nil
}
