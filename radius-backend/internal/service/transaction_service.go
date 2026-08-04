// radius-backend/internal/service/transaction_service.go
package service

import (
	"context"
	"radius/internal/models"
	"radius/internal/repository"
)

type TransactionService struct {
	salesRepo    *repository.SalesRepo
	employeeRepo *repository.EmployeeRepo
	sessionRepo  *repository.SessionRepo
}

func NewTransactionService(
	salesRepo *repository.SalesRepo,
	employeeRepo *repository.EmployeeRepo,
	sessionRepo *repository.SessionRepo,
) *TransactionService {
	return &TransactionService{
		salesRepo:    salesRepo,
		employeeRepo: employeeRepo,
		sessionRepo:  sessionRepo,
	}
}

func (s *TransactionService) GetAllTransactions(ctx context.Context, email string, role models.EmployeeRole, page, limit int) ([]models.Transaction, int, error) {
	var storeID *int
	if role != models.RoleAdmin {
		emp, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
		if err != nil {
			return nil, 0, err
		}
		storeID = &emp.StoreId
	}

	offset := (page - 1) * limit
	return s.salesRepo.GetAllTransactions(ctx, limit, offset, storeID)
}

func (s *TransactionService) GetTransactionByID(ctx context.Context, email string, role models.EmployeeRole, id int) (*models.Transaction, []models.TransactionItem, error) {
	var storeID *int
	if role != models.RoleAdmin {
		emp, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
		if err != nil {
			return nil, nil, err
		}
		storeID = &emp.StoreId
	}

	return s.salesRepo.GetTransactionByID(ctx, id, storeID)
}
