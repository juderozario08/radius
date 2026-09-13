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

	summaries, err := svc.GetWeeklyCycleCounts(context.Background(), email, "", nil)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if len(summaries) != 1 {
		t.Fatalf("expected 1 summary, got: %d", len(summaries))
	}

	if summaries[0].CategoryName != "Headphones" {
		t.Errorf("expected category Headphones, got %s", summaries[0].CategoryName)
	}

	targetStore := 3
	mockCycleCountRepo.EXPECT().
		GetWeeklyCycleCounts(gomock.Any(), targetStore).
		Return([]models.CycleCountSummary{
			{
				CountId:      102,
				StoreId:      targetStore,
				CategoryName: "Monitors",
			},
		}, nil)

	adminSummaries, err := svc.GetWeeklyCycleCounts(context.Background(), email, string(models.RoleAdmin), &targetStore)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if len(adminSummaries) != 1 || adminSummaries[0].CategoryName != "Monitors" {
		t.Errorf("expected Monitors for store 3, got: %v", adminSummaries)
	}
}

func TestCycleCountService_ApproveCount_ManagerOnly(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil)

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

	mockEmployeeRepo.EXPECT().GetEmployeeByEmail(gomock.Any(), empAEmail).Return(empA, nil)
	mockCycleCountRepo.EXPECT().GetCycleCountByID(gomock.Any(), countID, storeID).Return(&models.CycleCount{
		CountId:   countID,
		StoreId:   storeID,
		CountedBy: nil,
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

	adminEmail := "admin@radius.com"
	admin := &models.Employee{
		EmployeeId: 1,
		EmployeeBase: models.EmployeeBase{
			StoreId: 1,
			Role:    models.RoleAdmin,
		},
	}
	otherStoreCountID := 931
	otherStoreID := 5
	countedByEmp2 := 2
	countedByName := "Store 5 Employee"

	mockEmployeeRepo.EXPECT().GetEmployeeByEmail(gomock.Any(), adminEmail).Return(admin, nil)
	mockCycleCountRepo.EXPECT().GetCycleCountByID(gomock.Any(), otherStoreCountID, 0).Return(&models.CycleCount{
		CountId:       otherStoreCountID,
		StoreId:       otherStoreID,
		CountedBy:     &countedByEmp2,
		CountedByName: &countedByName,
		Status:        models.CycleCountStatusInProgress,
	}, nil)
	mockCycleCountRepo.EXPECT().GetCycleCountItems(gomock.Any(), otherStoreCountID).Return([]models.CycleCountItemDetail{
		{CountItemId: 1, CountId: otherStoreCountID, ProductId: 10, ExpectedQty: 5, CountedQty: 5},
	}, nil)

	resAdmin, err := svc.GetCycleCountDetail(context.Background(), adminEmail, otherStoreCountID)
	if err != nil {
		t.Fatalf("expected Admin to access other store count, got: %v", err)
	}
	if resAdmin == nil || resAdmin.Count.CountId != otherStoreCountID || resAdmin.Count.StoreId != otherStoreID {
		t.Fatalf("expected Admin to receive count 931 for store 5")
	}
}

func TestCycleCountService_ApproveCount_AdminCrossStore(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil)

	adminEmail := "admin@radius.com"
	admin := &models.Employee{
		EmployeeId: 1,
		EmployeeBase: models.EmployeeBase{
			StoreId: 1,
			Role:    models.RoleAdmin,
		},
	}
	countID := 931
	storeID := 5

	mockEmployeeRepo.EXPECT().GetEmployeeByEmail(gomock.Any(), adminEmail).Return(admin, nil)
	mockCycleCountRepo.EXPECT().GetCycleCountByID(gomock.Any(), countID, 0).Return(&models.CycleCount{
		CountId: countID,
		StoreId: storeID,
		Status:  models.CycleCountStatusPendingApproval,
	}, nil)
	mockCycleCountRepo.EXPECT().ApproveCycleCount(gomock.Any(), storeID, countID, admin.EmployeeId).Return(nil)

	err := svc.ApproveCount(context.Background(), adminEmail, models.ApproveCycleCountRequest{CountId: countID})
	if err != nil {
		t.Fatalf("expected Admin to approve cross-store count, got: %v", err)
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

	mockEmployeeRepo.EXPECT().GetEmployeeByEmail(gomock.Any(), salesEmail).Return(sales, nil)
	err := svc.TransferOwnership(context.Background(), salesEmail, models.TransferCycleCountOwnershipRequest{
		CountId:    countID,
		EmployeeId: targetEmpID,
	})
	if err == nil {
		t.Fatalf("expected non-manager transfer to fail, got nil")
	}

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

func TestCycleCountService_StartCount_BroadcastsEvent(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockBroadcaster := mocks.NewMockEventBroadcaster(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil, mockBroadcaster)

	email := "counter@store2.com"
	storeID := 2
	empID := 15
	catID := 3

	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), email).
		Return(&models.Employee{
			EmployeeId: empID,
			EmployeeBase: models.EmployeeBase{
				StoreId: storeID,
				Role:    models.RoleSales,
			},
		}, nil)

	mockCycleCountRepo.EXPECT().
		StartCycleCount(gomock.Any(), storeID, catID, empID).
		Return(&models.CycleCount{
			CountId:           401,
			StoreId:           storeID,
			CategoryId:        catID,
			CategoryName:      "Smartphones",
			Status:            models.CycleCountStatusInProgress,
			TotalItems:        60,
			CountedItems:      0,
			TotalVarianceCost: 0.0,
		}, nil)

	mockBroadcaster.EXPECT().
		BroadcastToStore(storeID, gomock.Cond(func(x any) bool {
			evt, ok := x.(models.WebSocketEvent)
			if !ok {
				return false
			}
			if evt.Type != models.EventCycleCountUpdated || evt.StoreId != storeID {
				return false
			}
			payload, ok := evt.Payload.(models.CycleCountUpdatedPayload)
			if !ok {
				return false
			}
			return payload.CountId == 401 &&
				payload.StoreId == storeID &&
				payload.CategoryName == "Smartphones" &&
				payload.Status == string(models.CycleCountStatusInProgress) &&
				payload.Action == "started" &&
				payload.TotalItems == 60
		})).
		Times(1)

	count, err := svc.StartCount(context.Background(), email, catID)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if count.CountId != 401 {
		t.Fatalf("expected count ID 401, got %d", count.CountId)
	}
}

func TestCycleCountService_RecordScan_BroadcastsEvent(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockBroadcaster := mocks.NewMockEventBroadcaster(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil, mockBroadcaster)

	email := "counter@store2.com"
	storeID := 2
	empID := 15
	countID := 401
	prodID := 10

	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), email).
		Return(&models.Employee{
			EmployeeId: empID,
			EmployeeBase: models.EmployeeBase{
				StoreId: storeID,
				Role:    models.RoleSales,
			},
		}, nil)

	mockCycleCountRepo.EXPECT().
		GetCycleCountByID(gomock.Any(), countID, storeID).
		Return(&models.CycleCount{
			CountId:           countID,
			StoreId:           storeID,
			CategoryId:        3,
			CategoryName:      "Smartphones",
			Status:            models.CycleCountStatusInProgress,
			CountedBy:         &empID,
			TotalItems:        60,
			CountedItems:      5,
			TotalVarianceCost: 0.0,
		}, nil)

	qty := 2
	req := models.RecordScanRequest{
		CountId:    countID,
		ProductId:  &prodID,
		CountedQty: &qty,
	}

	mockCycleCountRepo.EXPECT().
		RecordScan(gomock.Any(), storeID, req, empID).
		Return(&models.CycleCountItemDetail{
			CountItemId:  1,
			CountId:      countID,
			ProductId:    prodID,
			ExpectedQty:  2,
			CountedQty:   2,
			Variance:     0,
			VarianceCost: 0.0,
		}, nil)

	mockBroadcaster.EXPECT().
		BroadcastToStore(storeID, gomock.Cond(func(x any) bool {
			evt, ok := x.(models.WebSocketEvent)
			if !ok || evt.Type != models.EventCycleCountUpdated || evt.StoreId != storeID {
				return false
			}
			payload, ok := evt.Payload.(models.CycleCountUpdatedPayload)
			return ok && payload.CountId == countID && payload.Action == "scanned"
		})).
		Times(1)

	item, err := svc.RecordScan(context.Background(), email, req)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if item.CountItemId != 1 {
		t.Errorf("expected count item ID 1, got %d", item.CountItemId)
	}
}

func TestCycleCountService_SubmitForApproval_BroadcastsEvent(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockBroadcaster := mocks.NewMockEventBroadcaster(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil, mockBroadcaster)

	email := "counter@store2.com"
	storeID := 2
	empID := 15
	countID := 401

	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), email).
		Return(&models.Employee{
			EmployeeId: empID,
			EmployeeBase: models.EmployeeBase{
				StoreId: storeID,
				Role:    models.RoleSales,
			},
		}, nil)

	mockCycleCountRepo.EXPECT().
		GetCycleCountByID(gomock.Any(), countID, storeID).
		Return(&models.CycleCount{
			CountId:      countID,
			StoreId:      storeID,
			CategoryId:   3,
			CategoryName: "Smartphones",
			Status:       models.CycleCountStatusInProgress,
			CountedBy:    &empID,
		}, nil)

	notes := "Finished count"
	mockCycleCountRepo.EXPECT().
		SubmitForApproval(gomock.Any(), storeID, countID, &notes).
		Return(nil)

	mockBroadcaster.EXPECT().
		BroadcastToStore(storeID, gomock.Cond(func(x any) bool {
			evt, ok := x.(models.WebSocketEvent)
			if !ok || evt.Type != models.EventCycleCountUpdated || evt.StoreId != storeID {
				return false
			}
			payload, ok := evt.Payload.(models.CycleCountUpdatedPayload)
			return ok && payload.CountId == countID && payload.Action == "submitted" && payload.Status == string(models.CycleCountStatusPendingApproval)
		})).
		Times(1)

	err := svc.SubmitForApproval(context.Background(), email, models.SubmitCycleCountRequest{
		CountId: countID,
		Notes:   &notes,
	})
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
}

func TestCycleCountService_ApproveCount_BroadcastsEvent(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockBroadcaster := mocks.NewMockEventBroadcaster(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil, mockBroadcaster)

	mgrEmail := "manager@store2.com"
	storeID := 2
	empID := 2
	countID := 401

	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), mgrEmail).
		Return(&models.Employee{
			EmployeeId: empID,
			EmployeeBase: models.EmployeeBase{
				StoreId: storeID,
				Role:    models.RoleManager,
			},
		}, nil)

	mockCycleCountRepo.EXPECT().
		ApproveCycleCount(gomock.Any(), storeID, countID, empID).
		Return(nil)

	mockCycleCountRepo.EXPECT().
		GetCycleCountByID(gomock.Any(), countID, storeID).
		Return(&models.CycleCount{
			CountId:      countID,
			StoreId:      storeID,
			CategoryId:   3,
			CategoryName: "Smartphones",
			Status:       models.CycleCountStatusApproved,
			TotalItems:   60,
			CountedItems: 60,
		}, nil)

	mockBroadcaster.EXPECT().
		BroadcastToStore(storeID, gomock.Cond(func(x any) bool {
			evt, ok := x.(models.WebSocketEvent)
			if !ok || evt.Type != models.EventCycleCountUpdated || evt.StoreId != storeID {
				return false
			}
			payload, ok := evt.Payload.(models.CycleCountUpdatedPayload)
			return ok && payload.CountId == countID &&
				payload.StoreId == storeID &&
				payload.Status == string(models.CycleCountStatusApproved) &&
				payload.Action == "approved"
		})).
		Times(1)

	err := svc.ApproveCount(context.Background(), mgrEmail, models.ApproveCycleCountRequest{CountId: countID})
	if err != nil {
		t.Fatalf("expected manager approval to succeed, got: %v", err)
	}
}

func TestCycleCountService_TransferOwnership_BroadcastsEvent(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockBroadcaster := mocks.NewMockEventBroadcaster(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil, mockBroadcaster)

	mgrEmail := "mgr@store2.com"
	storeID := 2
	countID := 15
	targetEmpID := 105

	mgr := &models.Employee{
		EmployeeId: 2,
		EmployeeBase: models.EmployeeBase{
			StoreId: storeID,
			Role:    models.RoleManager,
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

	mockEmployeeRepo.EXPECT().GetEmployeeByEmail(gomock.Any(), mgrEmail).Return(mgr, nil)
	mockCycleCountRepo.EXPECT().GetCycleCountByID(gomock.Any(), countID, storeID).Return(&models.CycleCount{
		CountId:      countID,
		StoreId:      storeID,
		CategoryId:   3,
		CategoryName: "Smartphones",
		Status:       models.CycleCountStatusInProgress,
	}, nil)
	mockEmployeeRepo.EXPECT().GetEmployeeById(gomock.Any(), targetEmpID).Return(targetEmp, nil)
	mockCycleCountRepo.EXPECT().TransferOwnership(gomock.Any(), storeID, countID, targetEmpID).Return(nil)

	mockBroadcaster.EXPECT().
		BroadcastToStore(storeID, gomock.Cond(func(x any) bool {
			evt, ok := x.(models.WebSocketEvent)
			if !ok || evt.Type != models.EventCycleCountUpdated || evt.StoreId != storeID {
				return false
			}
			payload, ok := evt.Payload.(models.CycleCountUpdatedPayload)
			return ok && payload.CountId == countID && payload.Action == "transferred"
		})).
		Times(1)

	err := svc.TransferOwnership(context.Background(), mgrEmail, models.TransferCycleCountOwnershipRequest{
		CountId:    countID,
		EmployeeId: targetEmpID,
	})
	if err != nil {
		t.Fatalf("expected manager transfer to succeed, got: %v", err)
	}
}

func TestCycleCountService_NilBroadcasterSafe(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCycleCountRepo := mocks.NewMockCycleCountRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)

	svc := service.NewCycleCountService(mockCycleCountRepo, mockEmployeeRepo, nil, nil, nil, nil)

	mgrEmail := "manager@store2.com"
	storeID := 2
	empID := 2
	countID := 402

	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), mgrEmail).
		Return(&models.Employee{
			EmployeeId: empID,
			EmployeeBase: models.EmployeeBase{
				StoreId: storeID,
				Role:    models.RoleManager,
			},
		}, nil)

	mockCycleCountRepo.EXPECT().
		ApproveCycleCount(gomock.Any(), storeID, countID, empID).
		Return(nil)

	err := svc.ApproveCount(context.Background(), mgrEmail, models.ApproveCycleCountRequest{CountId: countID})
	if err != nil {
		t.Fatalf("expected manager approval to succeed with nil broadcaster, got: %v", err)
	}
}
