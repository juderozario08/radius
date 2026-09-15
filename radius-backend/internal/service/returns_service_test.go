package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"

	"go.uber.org/mock/gomock"
)

func TestReturnsService_CreateReturn(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockReturnsRepo := mocks.NewMockReturnsRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockProductRepo := mocks.NewMockProductRepository(ctrl)
	mockSalesRepo := mocks.NewMockSalesRepository(ctrl)

	svc := service.NewReturnsService(mockReturnsRepo, mockEmployeeRepo, mockProductRepo, mockSalesRepo)

	t.Run("successful return under 50 completed immediately", func(t *testing.T) {
		email := "cashier@radius.com"
		storeId := 2
		empId := 10

		mockEmployeeRepo.EXPECT().
			GetEmployeeByEmail(gomock.Any(), email).
			Return(&models.Employee{
				EmployeeId: empId,
				EmployeeBase: models.EmployeeBase{
					StoreId: storeId,
					Role:    models.RoleSales,
				},
			}, nil)

		mockProductRepo.EXPECT().
			GetProductByID(gomock.Any(), 101).
			Return(&models.Product{
				ProductId:    101,
				Name:         "Standard Stapler",
				IsReturnable: true,
			}, nil)

		req := models.CreateReturnRequest{
			RefundMethod: models.RefundMethodCash,
			Items: []models.CreateReturnItemRequest{
				{
					ProductId:    101,
					Quantity:     1,
					UnitPrice:    20.00,
					ReturnReason: "DEFECTIVE",
					Disposition:  models.ReturnDispositionDefectiveRtv,
				},
			},
		}

		mockReturnsRepo.EXPECT().
			CreateReturn(gomock.Any(), storeId, empId, models.ReturnStatusCompleted, req).
			Return(&models.CustomerReturn{
				ReturnId:     1,
				StoreId:      storeId,
				EmployeeId:   empId,
				Status:       models.ReturnStatusCompleted,
				RefundMethod: models.RefundMethodCash,
				Subtotal:     20.00,
				TotalRefund:  21.00,
			}, []models.CustomerReturnItem{
				{
					ReturnItemId: 1,
					ReturnId:     1,
					ProductId:    101,
					Quantity:     1,
					UnitPrice:    20.00,
				},
			}, nil)

		ret, err := svc.CreateReturn(context.Background(), email, req)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if ret.Status != models.ReturnStatusCompleted {
			t.Errorf("expected status COMPLETED, got %s", ret.Status)
		}
	})

	t.Run("return over 50 by cashier requires approval", func(t *testing.T) {
		email := "cashier@radius.com"
		storeId := 2
		empId := 10

		mockEmployeeRepo.EXPECT().
			GetEmployeeByEmail(gomock.Any(), email).
			Return(&models.Employee{
				EmployeeId: empId,
				EmployeeBase: models.EmployeeBase{
					StoreId: storeId,
					Role:    models.RoleSales,
				},
			}, nil)

		mockProductRepo.EXPECT().
			GetProductByID(gomock.Any(), 102).
			Return(&models.Product{
				ProductId:    102,
				Name:         "Wireless Headphones",
				IsReturnable: true,
			}, nil)

		req := models.CreateReturnRequest{
			RefundMethod: models.RefundMethodCard,
			Items: []models.CreateReturnItemRequest{
				{
					ProductId:    102,
					Quantity:     1,
					UnitPrice:    80.00,
					ReturnReason: "CHANGED_MIND",
					Disposition:  models.ReturnDispositionRestock,
				},
			},
		}

		mockReturnsRepo.EXPECT().
			CreateReturn(gomock.Any(), storeId, empId, models.ReturnStatusPendingApproval, req).
			Return(&models.CustomerReturn{
				ReturnId:     2,
				StoreId:      storeId,
				EmployeeId:   empId,
				Status:       models.ReturnStatusPendingApproval,
				RefundMethod: models.RefundMethodCard,
				Subtotal:     80.00,
				TotalRefund:  84.00,
			}, []models.CustomerReturnItem{
				{
					ReturnItemId: 2,
					ReturnId:     2,
					ProductId:    102,
					Quantity:     1,
					UnitPrice:    80.00,
				},
			}, nil)

		ret, err := svc.CreateReturn(context.Background(), email, req)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if ret.Status != models.ReturnStatusPendingApproval {
			t.Errorf("expected status PENDING_APPROVAL, got %s", ret.Status)
		}
	})

	t.Run("non-returnable product rejected", func(t *testing.T) {
		email := "cashier@radius.com"
		storeId := 2
		empId := 10

		mockEmployeeRepo.EXPECT().
			GetEmployeeByEmail(gomock.Any(), email).
			Return(&models.Employee{
				EmployeeId: empId,
				EmployeeBase: models.EmployeeBase{
					StoreId: storeId,
					Role:    models.RoleSales,
				},
			}, nil)

		mockProductRepo.EXPECT().
			GetProductByID(gomock.Any(), 103).
			Return(&models.Product{
				ProductId:    103,
				Name:         "Clearance Software License",
				IsReturnable: false,
			}, nil)

		req := models.CreateReturnRequest{
			RefundMethod: models.RefundMethodCash,
			Items: []models.CreateReturnItemRequest{
				{
					ProductId:    103,
					Quantity:     1,
					UnitPrice:    15.00,
					ReturnReason: "CHANGED_MIND",
					Disposition:  models.ReturnDispositionRestock,
				},
			},
		}

		_, err := svc.CreateReturn(context.Background(), email, req)
		if err == nil {
			t.Fatalf("expected error for non-returnable product, got nil")
		}
	})

	t.Run("item outside policy window without store credit rejected", func(t *testing.T) {
		email := "cashier@radius.com"
		storeId := 2
		empId := 10
		txId := int64(999)
		txItemId := int64(1001)

		mockEmployeeRepo.EXPECT().
			GetEmployeeByEmail(gomock.Any(), email).
			Return(&models.Employee{
				EmployeeId: empId,
				EmployeeBase: models.EmployeeBase{
					StoreId: storeId,
					Role:    models.RoleSales,
				},
			}, nil)

		mockReturnsRepo.EXPECT().
			LookupTransaction(gomock.Any(), txId, &storeId).
			Return(&models.LookupTransactionResponse{
				TransactionId: txId,
				StoreId:       storeId,
				DaysSinceSale: 45,
				Items: []models.OriginalTransactionItemForReturn{
					{
						TransactionItemId:     txItemId,
						ProductId:             104,
						ProductName:           "Desk Chair",
						PurchasedQty:          1,
						ReturnedQty:           0,
						ReturnableQty:         1,
						UnitPrice:             40.00,
						IsReturnable:          true,
						ReturnWindowDays:      30,
						IsOutsidePolicyWindow: true,
					},
				},
			}, nil)

		mockProductRepo.EXPECT().
			GetProductByID(gomock.Any(), 104).
			Return(&models.Product{
				ProductId:    104,
				Name:         "Desk Chair",
				IsReturnable: true,
			}, nil)

		req := models.CreateReturnRequest{
			OriginalTransactionId: &txId,
			RefundMethod:          models.RefundMethodCash,
			Items: []models.CreateReturnItemRequest{
				{
					ProductId:                 104,
					OriginalTransactionItemId: &txItemId,
					Quantity:                  1,
					UnitPrice:                 40.00,
					ReturnReason:              "CHANGED_MIND",
					Disposition:               models.ReturnDispositionRestock,
				},
			},
		}

		_, err := svc.CreateReturn(context.Background(), email, req)
		if err == nil {
			t.Fatalf("expected error for return outside policy without store credit, got nil")
		}
	})
}

func TestReturnsService_ApproveReturn(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockReturnsRepo := mocks.NewMockReturnsRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockProductRepo := mocks.NewMockProductRepository(ctrl)
	mockSalesRepo := mocks.NewMockSalesRepository(ctrl)

	svc := service.NewReturnsService(mockReturnsRepo, mockEmployeeRepo, mockProductRepo, mockSalesRepo)

	t.Run("manager can approve return for own store", func(t *testing.T) {
		email := "manager@radius.com"
		storeId := 2
		empId := 5
		returnId := 12

		mockEmployeeRepo.EXPECT().
			GetEmployeeByEmail(gomock.Any(), email).
			Return(&models.Employee{
				EmployeeId: empId,
				EmployeeBase: models.EmployeeBase{
					StoreId: storeId,
					Role:    models.RoleManager,
				},
			}, nil)

		mockReturnsRepo.EXPECT().
			GetReturnDetail(gomock.Any(), returnId).
			Return(&models.CustomerReturnSummary{
				ReturnId:    returnId,
				StoreId:     storeId,
				Status:      models.ReturnStatusPendingApproval,
				TotalRefund: 120.00,
			}, nil, nil)

		mockReturnsRepo.EXPECT().
			ApproveReturn(gomock.Any(), returnId, empId).
			Return(nil)

		err := svc.ApproveReturn(context.Background(), email, returnId)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
	})

	t.Run("cashier cannot approve return", func(t *testing.T) {
		email := "cashier@radius.com"
		storeId := 2
		empId := 10
		returnId := 12

		mockEmployeeRepo.EXPECT().
			GetEmployeeByEmail(gomock.Any(), email).
			Return(&models.Employee{
				EmployeeId: empId,
				EmployeeBase: models.EmployeeBase{
					StoreId: storeId,
					Role:    models.RoleSales,
				},
			}, nil)

		err := svc.ApproveReturn(context.Background(), email, returnId)
		if err == nil {
			t.Fatalf("expected error for cashier approving return, got nil")
		}
	})
}

