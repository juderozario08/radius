// radius-backend/internal/service/print_order_service.go
package service

import (
	"context"
	"radius/internal/models"
)

type PrintOrderService struct {
	ordersRepo   OrdersRepository
	employeeRepo EmployeeRepository
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

func (s *PrintOrderService) GetAllPrintOrders(ctx context.Context, email string, role models.EmployeeRole, page, limit int, criteria models.PrintOrderSearchCriteria) ([]models.PrintOrder, int, error) {
	isTargetedSearch := criteria.OrderID != nil ||
		criteria.CustomerName != "" ||
		criteria.CustomerEmail != "" ||
		criteria.CustomerPhone != ""

	var storeID *int
	if role != models.RoleAdmin && !isTargetedSearch {
		emp, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
		if err != nil {
			return nil, 0, err
		}
		storeID = &emp.StoreId
	}

	offset := (page - 1) * limit
	return s.ordersRepo.GetAllPrintOrders(ctx, limit, offset, storeID, criteria)
}

func (s *PrintOrderService) GetPrintOrderByID(ctx context.Context, email string, role models.EmployeeRole, id int) (*models.PrintOrder, []models.PrintOrderItem, error) {
	return s.ordersRepo.GetPrintOrderByID(ctx, id, nil)
}
