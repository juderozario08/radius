package service_test

import (
	"context"
	"errors"
	"fmt"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/mock/gomock"
)

func TestTransactionService_CreateTransaction_AutoReportsToFillReport(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockSalesRepo := mocks.NewMockSalesRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockFillReportRepo := mocks.NewMockFillReportRepository(ctrl)

	svc := service.NewTransactionService(mockSalesRepo, mockEmployeeRepo, nil, mockFillReportRepo)

	storeId := 3
	empId := 42

	req := models.CreateTransactionRequest{
		RegisterId:  "REG-01",
		TotalAmount: 25.50,
		Items: []models.CreateTransactionItemRequest{
			{
				ProductId: 101,
				Quantity:  2,
				UnitPrice: 10.00,
			},
			{
				ProductId: 102,
				Quantity:  1,
				UnitPrice: 5.50,
			},
		},
	}

	expectedItems := []models.TransactionItem{
		{
			TransactionId: 99,
			ProductId:     101,
			Quantity:      2,
			UnitPrice:     10.00,
		},
		{
			TransactionId: 99,
			ProductId:     102,
			Quantity:      1,
			UnitPrice:     5.50,
		},
	}

	mockSalesRepo.EXPECT().
		CreateTransaction(gomock.Any(), storeId, &empId, req).
		Return(&models.Transaction{
			TransactionId: 99,
			StoreId:       storeId,
			RegisterId:    "REG-01",
			TotalAmount:   25.50,
		}, expectedItems, nil)

	mockFillReportRepo.EXPECT().
		AddSoldItems(gomock.Any(), storeId, expectedItems).
		Return(nil)

	tx, err := svc.CreateTransaction(context.Background(), storeId, empId, models.RoleAdmin, req)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if tx.TransactionId != 99 {
		t.Errorf("Expected transaction ID 99, got %d", tx.TransactionId)
	}
}

func TestTransactionService_CreateTransaction_NonAdminForbidden(t *testing.T) {
	tests := []struct {
		name string
		role models.EmployeeRole
	}{
		{name: "sales", role: models.RoleSales},
		{name: "service", role: models.RoleService},
		{name: "manager", role: models.RoleManager},
		{name: "empty role", role: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockSalesRepo := mocks.NewMockSalesRepository(ctrl)
			mockFillReportRepo := mocks.NewMockFillReportRepository(ctrl)
			svc := service.NewTransactionService(mockSalesRepo, nil, nil, mockFillReportRepo)

			req := models.CreateTransactionRequest{
				RegisterId: "REG-01",
				Items:      []models.CreateTransactionItemRequest{{ProductId: 101, Quantity: 1}},
			}

			tx, err := svc.CreateTransaction(context.Background(), 3, 42, tt.role, req)
			if !errors.Is(err, service.ErrForbidden) {
				t.Fatalf("expected ErrForbidden, got %v", err)
			}
			if tx != nil {
				t.Fatalf("expected no transaction, got %+v", tx)
			}
		})
	}
}

func TestTransactionService_GetAllTransactions_Admin(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockSalesRepo := mocks.NewMockSalesRepository(ctrl)
	svc := service.NewTransactionService(mockSalesRepo, nil, nil, nil)

	mockSalesRepo.EXPECT().
		GetAllTransactions(gomock.Any(), 10, 0, nil).
		Return([]models.Transaction{
			{TransactionId: 1},
			{TransactionId: 2},
		}, 2, nil)

	txns, total, err := svc.GetAllTransactions(context.Background(), 1, models.RoleAdmin, 1, 10)
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
	svc := service.NewTransactionService(mockSalesRepo, mockEmployeeRepo, nil, nil)

	storeId := 5

	mockSalesRepo.EXPECT().
		GetAllTransactions(gomock.Any(), 10, 0, &storeId).
		Return([]models.Transaction{
			{TransactionId: 100},
		}, 1, nil)

	txns, total, err := svc.GetAllTransactions(context.Background(), storeId, models.RoleSales, 1, 10)
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

func TestTransactionService_CreateTransaction_InvalidatesInventoryCache(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	mockSalesRepo := mocks.NewMockSalesRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockFillReportRepo := mocks.NewMockFillReportRepository(ctrl)

	svc := service.NewTransactionService(mockSalesRepo, mockEmployeeRepo, nil, mockFillReportRepo, rdb)

	storeId := 3
	empId := 42
	barcode := "123456789012"

	tier2Key := fmt.Sprintf("radius:v1:inventory:store:%d:product:%d", storeId, 101)
	legacyKey := fmt.Sprintf("inventory:%d:barcode:%s", storeId, barcode)
	rdb.Set(context.Background(), tier2Key, "cached_data", time.Hour)
	rdb.Set(context.Background(), legacyKey, "cached_data", time.Hour)

	req := models.CreateTransactionRequest{
		RegisterId:  "REG-01",
		TotalAmount: 20.00,
		Items: []models.CreateTransactionItemRequest{
			{
				ProductId: 101,
				Quantity:  1,
				UnitPrice: 20.00,
			},
		},
	}

	expectedItems := []models.TransactionItem{
		{
			TransactionId:  99,
			ProductId:      101,
			Quantity:       1,
			UnitPrice:      20.00,
			ScannedBarcode: &barcode,
		},
	}

	mockSalesRepo.EXPECT().
		CreateTransaction(gomock.Any(), storeId, &empId, req).
		Return(&models.Transaction{
			TransactionId: 99,
			StoreId:       storeId,
			RegisterId:    "REG-01",
			TotalAmount:   20.00,
		}, expectedItems, nil)

	mockFillReportRepo.EXPECT().
		AddSoldItems(gomock.Any(), storeId, expectedItems).
		Return(nil)

	tx, err := svc.CreateTransaction(context.Background(), storeId, empId, models.RoleAdmin, req)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if tx == nil {
		t.Fatalf("expected transaction, got nil")
	}

	t2Exists, _ := rdb.Exists(context.Background(), tier2Key).Result()
	if t2Exists != 0 {
		t.Fatalf("expected tier2Key to be deleted, but still exists")
	}
	legacyExists, _ := rdb.Exists(context.Background(), legacyKey).Result()
	if legacyExists != 0 {
		t.Fatalf("expected legacyKey to be deleted, but still exists")
	}
}
