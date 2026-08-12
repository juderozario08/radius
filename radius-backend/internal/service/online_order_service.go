// radius-backend/internal/service/online_order_service.go
package service

import (
	"context"
	"radius/internal/models"
)

type OnlineOrderService struct {
	ordersRepo    OrdersRepository
	productsRepo  ProductRepository
	inventoryRepo InventoryRepository
	sessionRepo   SessionRepository
	storeRepo     StoreRepository
	employeeRepo  EmployeeRepository
}

func NewOnlineOrderService(
	ordersRepo OrdersRepository,
	productsRepo ProductRepository,
	inventoryRepo InventoryRepository,
	sessionRepo SessionRepository,
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
) *OnlineOrderService {
	return &OnlineOrderService{
		ordersRepo:    ordersRepo,
		productsRepo:  productsRepo,
		inventoryRepo: inventoryRepo,
		sessionRepo:   sessionRepo,
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
	}
}

func (s *OnlineOrderService) GetAllOnlineOrders(ctx context.Context, email string, role models.EmployeeRole, page, limit int, criteria models.OrderSearchCriteria) ([]models.OnlineOrder, int, error) {
	var storeID *int
	if role != models.RoleAdmin {
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
	var storeID *int
	if role != models.RoleAdmin {
		emp, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
		if err != nil {
			return nil, nil, err
		}
		storeID = &emp.StoreId
	}

	return s.ordersRepo.GetOnlineOrderByID(ctx, id, storeID)
}
