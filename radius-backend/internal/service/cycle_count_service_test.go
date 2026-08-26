// radius-backend/internal/service/cycle_count_service_test.go
package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"
	"time"

	"go.uber.org/mock/gomock"
)

func TestCycleCountService_GetWeeklyCycleCounts(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil)

	email := "test@radius.com"
	storeID := 1

	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), email).
		Return(&models.Employee{
			EmployeeBase: models.EmployeeBase{
				StoreId: storeID,
			},
		}, nil)

	mockCycleCountRepo.EXPECT().
		GetWeeklyCycleCounts(gomock.Any(), storeID).
		Return([]models.CycleCountSummary{
			{
				CountId:      1,
				StoreId:      storeID,
				CategoryName: "Headphones",
				CategoryId:   2,
				Status:       models.CycleCountStatusInProgress,
				TotalItems:   10,
				CountedItems: 5,
			},
		}, nil)

	summaries, err := svc.GetWeeklyCycleCounts(context.Background(), email)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if len(summaries) != 1 {
		t.Fatalf("expected 1 summary, got: %d", len(summaries))
	}

	if summaries[0].CategoryName != "Headphones" {
		t.Errorf("expected category Headphones, got %s", summaries[0].CategoryName)
	}
}

func TestCycleCountService_ApproveCount_ManagerOnly(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil)

	// 1. Non-manager should be denied
	salesEmail := "sales@radius.com"
	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), salesEmail).
		Return(&models.Employee{
			EmployeeId: 10,
			EmployeeBase: models.EmployeeBase{
				StoreId: 1,
				Role:    models.RoleSales,
			},
		}, nil)

	err := svc.ApproveCount(context.Background(), salesEmail, models.ApproveCycleCountRequest{CountId: 1})
	if err == nil {
		t.Fatalf("expected error for non-manager, got nil")
	}

	// 2. Manager should succeed
	mgrEmail := "manager@radius.com"
	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), mgrEmail).
		Return(&models.Employee{
			EmployeeId: 2,
			EmployeeBase: models.EmployeeBase{
				StoreId: 1,
				Role:    models.RoleManager,
			},
		}, nil)

	mockCycleCountRepo.EXPECT().
		ApproveCycleCount(gomock.Any(), 1, 1, 2).
		Return(nil)

	err = svc.ApproveCount(context.Background(), mgrEmail, models.ApproveCycleCountRequest{CountId: 1})
	if err != nil {
		t.Fatalf("expected manager approval to succeed, got: %v", err)
	}
}

func TestCycleCountService_RecordScan(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil)

	email := "counter@radius.com"
	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), email).
		Return(&models.Employee{
			EmployeeId: 5,
			EmployeeBase: models.EmployeeBase{
				StoreId: 1,
				Role:    models.RoleSales,
			},
		}, nil)

	now := time.Now()
	empID := 5
	reason := "Damaged stock"
	prodID := 101
	qty := 8
	req := models.RecordScanRequest{
		CountId:    10,
		ProductId:  &prodID,
		CountedQty: &qty,
		ReasonCode: &reason,
	}

	mockCycleCountRepo.EXPECT().
		GetCycleCountByID(gomock.Any(), 10, 1).
		Return(&models.CycleCount{
			CountId:   10,
			StoreId:   1,
			CountedBy: &empID,
		}, nil)

	mockCycleCountRepo.EXPECT().
		RecordScan(gomock.Any(), 1, req, 5).
		Return(&models.CycleCountItemDetail{
			CountItemId:  1,
			CountId:      10,
			ProductId:    101,
			ProductName:  "Belkin Cable",
			ExpectedQty:  10,
			CountedQty:   8,
			Variance:     -2,
			VarianceCost: -20.00,
			ReasonCode:   &reason,
			ScannedAt:    &now,
			ScannedBy:    &empID,
		}, nil)

	item, err := svc.RecordScan(context.Background(), email, req)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if item.Variance != -2 {
		t.Errorf("expected variance -2, got %d", item.Variance)
	}
}

func TestCycleCountService_RecordScan_ZeroQuantityUnlistedProduct(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil)

	email := "counter@radius.com"
	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), email).
		Return(&models.Employee{
			EmployeeId: 5,
			EmployeeBase: models.EmployeeBase{
				StoreId: 1,
				Role:    models.RoleSales,
			},
		}, nil)

	now := time.Now()
	empID := 5
	barcode := "00100000000099"
	reason := "0-quantity stock found during count"
	req := models.RecordScanRequest{
		CountId: 10,
		Barcode: &barcode,
	}

	mockCycleCountRepo.EXPECT().
		GetCycleCountByID(gomock.Any(), 10, 1).
		Return(&models.CycleCount{
			CountId:   10,
			StoreId:   1,
			CountedBy: &empID,
		}, nil)

	mockCycleCountRepo.EXPECT().
		RecordScan(gomock.Any(), 1, req, 5).
		Return(&models.CycleCountItemDetail{
			CountItemId:  2,
			CountId:      10,
			ProductId:    99,
			ProductName:  "New Headset 99",
			ExpectedQty:  0,
			CountedQty:   1,
			Variance:     1,
			VarianceCost: 35.00,
			ReasonCode:   &reason,
			ScannedAt:    &now,
			ScannedBy:    &empID,
		}, nil)

	item, err := svc.RecordScan(context.Background(), email, req)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if item.ExpectedQty != 0 {
		t.Errorf("expected 0 expected_qty, got %d", item.ExpectedQty)
	}
	if item.CountedQty != 1 {
		t.Errorf("expected 1 counted_qty, got %d", item.CountedQty)
	}
	if item.Variance != 1 {
		t.Errorf("expected variance 1, got %d", item.Variance)
	}
}

func TestCycleCountService_AutoAssignmentAndLocking(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil)

	empAEmail := "empa@radius.com"
	empBEmail := "empb@radius.com"
	mgrEmail := "mgr@radius.com"
	storeID := 1
	countID := 42

	empA := &models.Employee{
		EmployeeId: 101,
		EmployeeBase: models.EmployeeBase{
			StoreId: storeID,
			Role:    models.RoleSales,
		},
	}
	empB := &models.Employee{
		EmployeeId: 102,
		EmployeeBase: models.EmployeeBase{
			StoreId: storeID,
			Role:    models.RoleSales,
		},
	}
	mgr := &models.Employee{
		EmployeeId: 200,
		EmployeeBase: models.EmployeeBase{
			StoreId: storeID,
			Role:    models.RoleManager,
		},
	}

	// 1. Employee A opens an unassigned count -> Auto-assigned to Employee A
	mockEmployeeRepo.EXPECT().GetEmployeeByEmail(gomock.Any(), empAEmail).Return(empA, nil)
	mockCycleCountRepo.EXPECT().GetCycleCountByID(gomock.Any(), countID, storeID).Return(&models.CycleCount{
		CountId:   countID,
		StoreId:   storeID,
		CountedBy: nil, // unassigned
		Status:    models.CycleCountStatusNotStarted,
	}, nil)
	mockCycleCountRepo.EXPECT().AutoAssignCycleCount(gomock.Any(), countID, storeID, 101).Return(&models.CycleCount{
		CountId:   countID,
		StoreId:   storeID,
		CountedBy: &empA.EmployeeId,
		Status:    models.CycleCountStatusInProgress,
	}, nil)
	mockCycleCountRepo.EXPECT().GetCycleCountItems(gomock.Any(), countID).Return([]models.CycleCountItemDetail{}, nil)

	resA, err := svc.GetCycleCountDetail(context.Background(), empAEmail, countID)
	if err != nil {
		t.Fatalf("expected auto-assignment to succeed, got: %v", err)
	}
	if resA.Count.CountedBy == nil || *resA.Count.CountedBy != 101 {
		t.Errorf("expected count to be assigned to 101, got: %v", resA.Count.CountedBy)
	}

	// 2. Employee B tries to open count assigned to Employee A -> Locked / Rejected
	nameA := "Employee A"
	mockEmployeeRepo.EXPECT().GetEmployeeByEmail(gomock.Any(), empBEmail).Return(empB, nil)
	mockCycleCountRepo.EXPECT().GetCycleCountByID(gomock.Any(), countID, storeID).Return(&models.CycleCount{
		CountId:       countID,
		StoreId:       storeID,
		CountedBy:     &empA.EmployeeId,
		CountedByName: &nameA,
		Status:        models.CycleCountStatusInProgress,
	}, nil)

	_, err = svc.GetCycleCountDetail(context.Background(), empBEmail, countID)
	if err == nil {
		t.Fatalf("expected Employee B to be blocked by concurrency lock, got nil")
	}

	// 3. Manager opens count assigned to Employee A -> Manager is allowed access
	mockEmployeeRepo.EXPECT().GetEmployeeByEmail(gomock.Any(), mgrEmail).Return(mgr, nil)
	mockCycleCountRepo.EXPECT().GetCycleCountByID(gomock.Any(), countID, storeID).Return(&models.CycleCount{
		CountId:       countID,
		StoreId:       storeID,
		CountedBy:     &empA.EmployeeId,
		CountedByName: &nameA,
		Status:        models.CycleCountStatusInProgress,
	}, nil)
	mockCycleCountRepo.EXPECT().GetCycleCountItems(gomock.Any(), countID).Return([]models.CycleCountItemDetail{}, nil)

	resMgr, err := svc.GetCycleCountDetail(context.Background(), mgrEmail, countID)
	if err != nil {
		t.Fatalf("expected Manager to be allowed access, got: %v", err)
	}
	if resMgr == nil {
		t.Fatalf("expected non-nil response for manager")
	}
}

func TestCycleCountService_TransferOwnership(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil)

	mgrEmail := "mgr@radius.com"
	salesEmail := "sales@radius.com"
	storeID := 1
	countID := 15
	targetEmpID := 105

	mgr := &models.Employee{
		EmployeeId: 2,
		EmployeeBase: models.EmployeeBase{
			StoreId: storeID,
			Role:    models.RoleManager,
		},
	}
	sales := &models.Employee{
		EmployeeId: 10,
		EmployeeBase: models.EmployeeBase{
			StoreId: storeID,
			Role:    models.RoleSales,
		},
	}
	isTerminated := false
	isActive := true
	targetEmp := &models.Employee{
		EmployeeId: targetEmpID,
		EmployeeBase: models.EmployeeBase{
			StoreId:      storeID,
			IsTerminated: &isTerminated,
			IsActive:     &isActive,
		},
	}

	// 1. Non-manager transfer rejected
	mockEmployeeRepo.EXPECT().GetEmployeeByEmail(gomock.Any(), salesEmail).Return(sales, nil)
	err := svc.TransferOwnership(context.Background(), salesEmail, models.TransferCycleCountOwnershipRequest{
		CountId:    countID,
		EmployeeId: targetEmpID,
	})
	if err == nil {
		t.Fatalf("expected non-manager transfer to fail, got nil")
	}

	// 2. Manager transfer success
	mockEmployeeRepo.EXPECT().GetEmployeeByEmail(gomock.Any(), mgrEmail).Return(mgr, nil)
	mockCycleCountRepo.EXPECT().GetCycleCountByID(gomock.Any(), countID, storeID).Return(&models.CycleCount{
		CountId: countID,
		StoreId: storeID,
	}, nil)
	mockEmployeeRepo.EXPECT().GetEmployeeById(gomock.Any(), targetEmpID).Return(targetEmp, nil)
	mockCycleCountRepo.EXPECT().TransferOwnership(gomock.Any(), storeID, countID, targetEmpID).Return(nil)

	err = svc.TransferOwnership(context.Background(), mgrEmail, models.TransferCycleCountOwnershipRequest{
		CountId:    countID,
		EmployeeId: targetEmpID,
	})
	if err != nil {
		t.Fatalf("expected manager transfer to succeed, got: %v", err)
	}
}
