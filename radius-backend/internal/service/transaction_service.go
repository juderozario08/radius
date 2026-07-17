//radius-backend/internal/service/transaction_service.go
package service

import "radius/internal/repository"

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
