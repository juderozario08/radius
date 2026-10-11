package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"strings"
	"testing"

	"go.uber.org/mock/gomock"
)

type returnsServiceMocks struct {
	returnsRepo *mocks.MockReturnsRepository
	productRepo *mocks.MockProductRepository
	storeRepo   *mocks.MockStoreRepository
}

func newReturnsService(t *testing.T) (*service.ReturnsService, returnsServiceMocks) {
	ctrl := gomock.NewController(t)
	m := returnsServiceMocks{
		returnsRepo: mocks.NewMockReturnsRepository(ctrl),
		productRepo: mocks.NewMockProductRepository(ctrl),
		storeRepo:   mocks.NewMockStoreRepository(ctrl),
	}
	svc := service.NewReturnsService(m.returnsRepo, mocks.NewMockEmployeeRepository(ctrl), m.productRepo, mocks.NewMockSalesRepository(ctrl), m.storeRepo)
	return svc, m
}

func expectCreateReturn(m returnsServiceMocks, storeId, empId int, status models.ReturnStatus, captured *models.CreateReturnRequest) {
	m.returnsRepo.EXPECT().
		CreateReturn(gomock.Any(), storeId, empId, status, gomock.Any()).
		DoAndReturn(func(_ context.Context, storeID, employeeID int, st models.ReturnStatus, req models.CreateReturnRequest) (*models.CustomerReturn, []models.CustomerReturnItem, error) {
			*captured = req
			return &models.CustomerReturn{
				ReturnId:     1,
				StoreId:      storeID,
				EmployeeId:   employeeID,
				Status:       st,
				RefundMethod: req.RefundMethod,
				Subtotal:     req.Subtotal,
				TaxAmount:    req.TaxAmount,
				TotalRefund:  req.TotalRefund,
			}, []models.CustomerReturnItem{{ReturnItemId: 1, ReturnId: 1}}, nil
		})
}

func TestReturnsService_CreateReturn_NoReceiptUsesStoreProvinceTax(t *testing.T) {
	tests := []struct {
		name        string
		province    string
		retailPrice models.Money
		quantity    int
		wantTax     models.Money
	}{
		{name: "british columbia 12%", province: "British Columbia", retailPrice: 1999, quantity: 1, wantTax: 240},
		{name: "ontario 13%", province: "Ontario", retailPrice: 2500, quantity: 4, wantTax: 1300},
		{name: "quebec 14.975%", province: "Quebec", retailPrice: 500, quantity: 2, wantTax: 150},
		{name: "alberta 5%", province: "Alberta", retailPrice: 1999, quantity: 1, wantTax: 100},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, m := newReturnsService(t)
			storeId, empId := 2, 10

			m.productRepo.EXPECT().
				GetProductByID(gomock.Any(), 101).
				Return(&models.Product{ProductId: 101, Name: "Stapler", IsReturnable: true, RetailPrice: tt.retailPrice}, nil)
			m.storeRepo.EXPECT().
				GetStore(gomock.Any(), storeId).
				Return(&models.Store{StoreId: storeId, StoreBase: models.StoreBase{Province: tt.province}}, nil)

			var captured models.CreateReturnRequest
			expectCreateReturn(m, storeId, empId, models.ReturnStatusCompleted, &captured)

			req := models.CreateReturnRequest{
				RefundMethod: models.RefundMethodCash,
				Items: []models.CreateReturnItemRequest{
					{ProductId: 101, Quantity: tt.quantity, UnitPrice: 1, ReturnReason: "DEFECTIVE", Disposition: models.ReturnDispositionDefectiveRtv},
				},
			}

			ret, err := svc.CreateReturn(context.Background(), storeId, empId, models.RoleManager, req)
			if err != nil {
				t.Fatalf("expected no error, got %v", err)
			}

			wantSubtotal := tt.retailPrice.Times(tt.quantity)
			if captured.Items[0].UnitPrice != tt.retailPrice {
				t.Errorf("unit price = %s, want retail %s", captured.Items[0].UnitPrice, tt.retailPrice)
			}
			if captured.Subtotal != wantSubtotal || captured.TaxAmount != tt.wantTax || captured.TotalRefund != wantSubtotal+tt.wantTax {
				t.Errorf("got subtotal %s tax %s total %s, want %s / %s / %s", captured.Subtotal, captured.TaxAmount, captured.TotalRefund, wantSubtotal, tt.wantTax, wantSubtotal+tt.wantTax)
			}
			if captured.Items[0].TaxAmount != tt.wantTax {
				t.Errorf("item tax = %s, want %s", captured.Items[0].TaxAmount, tt.wantTax)
			}
			if ret.TotalRefund != wantSubtotal+tt.wantTax {
				t.Errorf("returned total = %s, want %s", ret.TotalRefund, wantSubtotal+tt.wantTax)
			}
		})
	}
}

func receiptTx(txId int64, storeId int) *models.LookupTransactionResponse {
	return &models.LookupTransactionResponse{
		TransactionId: txId,
		StoreId:       storeId,
		DaysSinceSale: 3,
		Subtotal:      10309,
		TaxAmount:     1340,
		TotalAmount:   11649,
		Items: []models.OriginalTransactionItemForReturn{
			{TransactionItemId: 1001, ProductId: 104, ProductName: "Desk Lamp", PurchasedQty: 3, ReturnableQty: 3, UnitPrice: 103, IsReturnable: true, ReturnWindowDays: 30},
			{TransactionItemId: 1002, ProductId: 105, ProductName: "Monitor", PurchasedQty: 1, ReturnableQty: 1, UnitPrice: 10000, IsReturnable: true, ReturnWindowDays: 30},
		},
	}
}

func TestReturnsService_CreateReturn_ReceiptRefundsChargedTax(t *testing.T) {
	txId := int64(999)
	lampItem, monitorItem := int64(1001), int64(1002)

	tests := []struct {
		name             string
		refundedSubtotal models.Money
		refundedTax      models.Money
		items            []models.CreateReturnItemRequest
		wantSubtotal     models.Money
		wantTax          models.Money
		wantItemTaxes    []models.Money
		wantStatus       models.ReturnStatus
	}{
		{
			name:          "first lamp refunds its share of the receipt tax",
			items:         []models.CreateReturnItemRequest{{ProductId: 104, OriginalTransactionItemId: &lampItem, Quantity: 1, UnitPrice: 99999}},
			wantSubtotal:  103,
			wantTax:       13,
			wantItemTaxes: []models.Money{13},
			wantStatus:    models.ReturnStatusCompleted,
		},
		{
			name:             "second lamp absorbs the rounding remainder",
			refundedSubtotal: 103,
			refundedTax:      13,
			items:            []models.CreateReturnItemRequest{{ProductId: 104, OriginalTransactionItemId: &lampItem, Quantity: 1}},
			wantSubtotal:     103,
			wantTax:          14,
			wantItemTaxes:    []models.Money{14},
			wantStatus:       models.ReturnStatusCompleted,
		},
		{
			name: "whole receipt refunds exactly the tax charged",
			items: []models.CreateReturnItemRequest{
				{ProductId: 104, OriginalTransactionItemId: &lampItem, Quantity: 3, UnitPrice: 1},
				{ProductId: 105, OriginalTransactionItemId: &monitorItem, Quantity: 1, UnitPrice: 1},
			},
			wantSubtotal:  10309,
			wantTax:       1340,
			wantItemTaxes: []models.Money{40, 1300},
			wantStatus:    models.ReturnStatusPendingApproval,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, m := newReturnsService(t)
			storeId, empId := 2, 10

			lookup := receiptTx(txId, storeId)
			lookup.RefundedSubtotal = tt.refundedSubtotal
			lookup.RefundedTax = tt.refundedTax
			lookup.RefundedTotal = tt.refundedSubtotal + tt.refundedTax
			m.returnsRepo.EXPECT().LookupTransaction(gomock.Any(), txId, &storeId).Return(lookup, nil)
			for _, item := range tt.items {
				m.productRepo.EXPECT().
					GetProductByID(gomock.Any(), item.ProductId).
					Return(&models.Product{ProductId: item.ProductId, Name: "Item", IsReturnable: true, RetailPrice: 50000}, nil)
			}

			var captured models.CreateReturnRequest
			expectCreateReturn(m, storeId, empId, tt.wantStatus, &captured)

			req := models.CreateReturnRequest{OriginalTransactionId: &txId, RefundMethod: models.RefundMethodCard, Items: tt.items}
			if _, err := svc.CreateReturn(context.Background(), storeId, empId, models.RoleSales, req); err != nil {
				t.Fatalf("expected no error, got %v", err)
			}

			if captured.Subtotal != tt.wantSubtotal || captured.TaxAmount != tt.wantTax || captured.TotalRefund != tt.wantSubtotal+tt.wantTax {
				t.Errorf("got subtotal %s tax %s total %s, want %s / %s", captured.Subtotal, captured.TaxAmount, captured.TotalRefund, tt.wantSubtotal, tt.wantTax)
			}
			for i, want := range tt.wantItemTaxes {
				if captured.Items[i].TaxAmount != want {
					t.Errorf("item %d tax = %s, want %s", i, captured.Items[i].TaxAmount, want)
				}
				wantPrice := lookup.Items[i].UnitPrice
				if captured.Items[i].UnitPrice != wantPrice {
					t.Errorf("item %d unit price = %s, want receipt price %s", i, captured.Items[i].UnitPrice, wantPrice)
				}
			}
		})
	}
}

func TestReturnsService_CreateReturn_Rejections(t *testing.T) {
	txId := int64(999)
	lampItem, monitorItem, unknownItem := int64(1001), int64(1002), int64(4242)

	tests := []struct {
		name          string
		withReceipt   bool
		refundedTotal models.Money
		outsideWindow bool
		refundMethod  models.RefundMethod
		productReturn bool
		items         []models.CreateReturnItemRequest
		wantErr       string
	}{
		{
			name:    "unknown product",
			items:   []models.CreateReturnItemRequest{{ProductId: 0, Quantity: 1}},
			wantErr: "product 0 not found",
		},
		{
			name:          "non-returnable product",
			productReturn: false,
			items:         []models.CreateReturnItemRequest{{ProductId: 103, Quantity: 1}},
			wantErr:       "non-returnable",
		},
		{
			name:          "more quantity than sold",
			withReceipt:   true,
			productReturn: true,
			items:         []models.CreateReturnItemRequest{{ProductId: 104, OriginalTransactionItemId: &lampItem, Quantity: 4}},
			wantErr:       "exceeds returnable qty (3)",
		},
		{
			name:          "split lines exceeding quantity sold",
			withReceipt:   true,
			productReturn: true,
			items: []models.CreateReturnItemRequest{
				{ProductId: 104, OriginalTransactionItemId: &lampItem, Quantity: 2},
				{ProductId: 104, OriginalTransactionItemId: &lampItem, Quantity: 2},
			},
			wantErr: "requested return qty (4) exceeds returnable qty (3)",
		},
		{
			name:          "refund beyond what remains unrefunded on the receipt",
			withReceipt:   true,
			refundedTotal: 11600,
			productReturn: true,
			items:         []models.CreateReturnItemRequest{{ProductId: 105, OriginalTransactionItemId: &monitorItem, Quantity: 1}},
			wantErr:       "exceeds the $0.49 remaining",
		},
		{
			name:          "item not on the receipt",
			withReceipt:   true,
			productReturn: true,
			items:         []models.CreateReturnItemRequest{{ProductId: 104, OriginalTransactionItemId: &unknownItem, Quantity: 1}},
			wantErr:       "was not sold on transaction",
		},
		{
			name:          "receipt line belongs to a different product",
			withReceipt:   true,
			productReturn: true,
			items:         []models.CreateReturnItemRequest{{ProductId: 104, OriginalTransactionItemId: &monitorItem, Quantity: 1}},
			wantErr:       "was not sold on transaction",
		},
		{
			name:          "receipt return without a receipt line",
			withReceipt:   true,
			productReturn: true,
			items:         []models.CreateReturnItemRequest{{ProductId: 104, Quantity: 1}},
			wantErr:       "must reference an item",
		},
		{
			name:          "receipt line without a receipt",
			productReturn: true,
			items:         []models.CreateReturnItemRequest{{ProductId: 104, OriginalTransactionItemId: &lampItem, Quantity: 1}},
			wantErr:       "requires original_transaction_id",
		},
		{
			name:          "outside policy window without store credit",
			withReceipt:   true,
			outsideWindow: true,
			productReturn: true,
			items:         []models.CreateReturnItemRequest{{ProductId: 104, OriginalTransactionItemId: &lampItem, Quantity: 1}},
			wantErr:       "outside return policy window",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, m := newReturnsService(t)
			storeId, empId := 2, 10

			req := models.CreateReturnRequest{RefundMethod: models.RefundMethodCash, Items: tt.items}
			if tt.withReceipt {
				lookup := receiptTx(txId, storeId)
				lookup.RefundedTotal = tt.refundedTotal
				lookup.RefundedSubtotal = tt.refundedTotal
				for i := range lookup.Items {
					lookup.Items[i].IsOutsidePolicyWindow = tt.outsideWindow
				}
				m.returnsRepo.EXPECT().LookupTransaction(gomock.Any(), txId, &storeId).Return(lookup, nil)
				req.OriginalTransactionId = &txId
			}
			m.productRepo.EXPECT().
				GetProductByID(gomock.Any(), gomock.Any()).
				DoAndReturn(func(_ context.Context, id int) (*models.Product, error) {
					if id == 0 {
						return nil, nil
					}
					return &models.Product{ProductId: id, Name: "Item", IsReturnable: tt.productReturn, RetailPrice: 1500}, nil
				}).
				AnyTimes()

			_, err := svc.CreateReturn(context.Background(), storeId, empId, models.RoleManager, req)
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("expected error containing %q, got %v", tt.wantErr, err)
			}
		})
	}
}

func TestReturnsService_CreateReturn_ApprovalThresholdUsesServerPrice(t *testing.T) {
	svc, m := newReturnsService(t)
	storeId, empId := 2, 10

	m.productRepo.EXPECT().
		GetProductByID(gomock.Any(), 102).
		Return(&models.Product{ProductId: 102, Name: "Wireless Headphones", IsReturnable: true, RetailPrice: 8000}, nil)
	m.storeRepo.EXPECT().
		GetStore(gomock.Any(), storeId).
		Return(&models.Store{StoreId: storeId, StoreBase: models.StoreBase{Province: "Ontario"}}, nil)

	var captured models.CreateReturnRequest
	expectCreateReturn(m, storeId, empId, models.ReturnStatusPendingApproval, &captured)

	req := models.CreateReturnRequest{
		RefundMethod: models.RefundMethodCard,
		Items: []models.CreateReturnItemRequest{
			{ProductId: 102, Quantity: 1, UnitPrice: 1, ReturnReason: "CHANGED_MIND", Disposition: models.ReturnDispositionRestock},
		},
	}

	ret, err := svc.CreateReturn(context.Background(), storeId, empId, models.RoleSales, req)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if ret.Status != models.ReturnStatusPendingApproval {
		t.Errorf("expected status PENDING_APPROVAL, got %s", ret.Status)
	}
	if captured.TotalRefund != 9040 {
		t.Errorf("total refund = %s, want 90.40", captured.TotalRefund)
	}
}

func TestReturnsService_ApproveReturn(t *testing.T) {
	t.Run("manager can approve return for own store", func(t *testing.T) {
		svc, m := newReturnsService(t)
		storeId := 2
		empId := 5
		returnId := 12

		m.returnsRepo.EXPECT().
			GetReturnDetail(gomock.Any(), returnId).
			Return(&models.CustomerReturnSummary{
				ReturnId:    returnId,
				StoreId:     storeId,
				Status:      models.ReturnStatusPendingApproval,
				TotalRefund: 12000,
			}, nil, nil)

		m.returnsRepo.EXPECT().
			ApproveReturn(gomock.Any(), returnId, empId).
			Return(nil)

		err := svc.ApproveReturn(context.Background(), storeId, empId, models.RoleManager, returnId)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
	})

	t.Run("cashier cannot approve return", func(t *testing.T) {
		svc, _ := newReturnsService(t)
		err := svc.ApproveReturn(context.Background(), 2, 10, models.RoleSales, 12)
		if err == nil {
			t.Fatalf("expected error for cashier approving return, got nil")
		}
	})
}
