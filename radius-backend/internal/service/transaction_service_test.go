package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"

	"go.uber.org/mock/gomock"
)

func TestTransactionService_GetAllTransactions_Admin(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockSalesRepo := mocks.NewMockSalesRepository(ctrl)
	svc := service.NewTransactionService(mockSalesRepo, nil, nil)

	mockSalesRepo.EXPECT().
		GetAllTransactions(gomock.Any(), 10, 0, nil). // storeID should be nil for Admin
		Return([]models.Transaction{
			{TransactionId: 1},
			{TransactionId: 2},
		}, 2, nil)

	txns, total, err := svc.GetAllTransactions(context.Background(), "admin@test.com", models.RoleAdmin, 1, 10)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if total != 2 {
		t.Fatalf("expected 2 total, got %d", total)
	}
	if len(txns) != 2 {
		t.Fatalf("expected 2 transactions, got %d", len(txns))
	}
}

func TestTransactionService_GetAllTransactions_NonAdmin(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockSalesRepo := mocks.NewMockSalesRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewTransactionService(mockSalesRepo, mockEmployeeRepo, nil)

	storeId := 5

	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), "sales@test.com").
		Return(&models.Employee{
			EmployeeBase: models.EmployeeBase{
				StoreId: storeId,
			},
		}, nil)

	mockSalesRepo.EXPECT().
		GetAllTransactions(gomock.Any(), 10, 0, &storeId). // storeID should be passed
		Return([]models.Transaction{
			{TransactionId: 100},
		}, 1, nil)

	txns, total, err := svc.GetAllTransactions(context.Background(), "sales@test.com", models.RoleSales, 1, 10)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if total != 1 {
		t.Fatalf("expected 1 total, got %d", total)
	}
	if len(txns) != 1 {
		t.Fatalf("expected 1 transaction, got %d", len(txns))
	}
}
