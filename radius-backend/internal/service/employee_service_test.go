package service_test

import (
	"context"
	"errors"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/mock/gomock"
)

func TestEmployeeService_GetManagerEmployees_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewEmployeeService(mockRepo, nil)

	storeId := 5

	mockRepo.EXPECT().
		GetAllEmployees(gomock.Any(), 10, 0, gomock.Any()).
		Return([]models.Employee{
			{EmployeeId: 1, EmployeeBase: models.EmployeeBase{StoreId: storeId}},
			{EmployeeId: 2, EmployeeBase: models.EmployeeBase{StoreId: storeId}},
		}, 2, nil)

	res, err := svc.GetManagerEmployees(context.Background(), storeId, models.RoleManager, 1, 10)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if res.TotalLength != 2 {
		t.Fatalf("expected 2 employees, got %d", res.TotalLength)
	}
	if res.Employees[0].StoreId != storeId {
		t.Fatalf("expected store id %d, got %d", storeId, res.Employees[0].StoreId)
	}
}

func TestEmployeeService_GetManagerEmployees_AdminStoreOverride(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewEmployeeService(mockRepo, nil)

	overrideStoreID := 9

	mockRepo.EXPECT().
		GetAllEmployees(gomock.Any(), 10, 0, &overrideStoreID).
		Return([]models.Employee{
			{EmployeeId: 10, EmployeeBase: models.EmployeeBase{StoreId: overrideStoreID}},
		}, 1, nil)

	res, err := svc.GetManagerEmployees(context.Background(), 1, models.RoleAdmin, 1, 10, &overrideStoreID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if res.TotalLength != 1 || res.Employees[0].StoreId != overrideStoreID {
		t.Fatalf("expected 1 employee with store id %d", overrideStoreID)
	}
}

func TestEmployeeService_GetManagerEmployees_NonAdminCannotOverride(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewEmployeeService(mockRepo, nil)

	storeId := 5
	overrideStoreID := 9

	mockRepo.EXPECT().
		GetAllEmployees(gomock.Any(), 10, 0, &storeId).
		Return([]models.Employee{
			{EmployeeId: 1, EmployeeBase: models.EmployeeBase{StoreId: storeId}},
		}, 1, nil)

	res, err := svc.GetManagerEmployees(context.Background(), storeId, models.RoleManager, 1, 10, &overrideStoreID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(res.Employees) != 1 || res.Employees[0].StoreId != storeId {
		t.Fatalf("expected employee with store id %d, got override", storeId)
	}
}

func TestEmployeeService_UpdateEmployee_InvalidState(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewEmployeeService(mockRepo, nil)

	isActive := true
	isTerminated := true

	employee := models.Employee{
		EmployeeBase: models.EmployeeBase{
			IsActive:     &isActive,
			IsTerminated: &isTerminated,
		},
	}

	_, err := svc.UpdateEmployee(context.Background(), employee)
	if err == nil {
		t.Fatal("expected error when setting both active and terminated to true")
	}
}

func TestEmployeeService_CreateEmployee_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewEmployeeService(mockRepo, nil)

	req := models.CreateEmployeeRequest{
		Password: "securepass",
		EmployeeBase: models.EmployeeBase{
			Email:      "new@test.com",
			FirstName:  "John",
			LastName:   "Doe",
			Province:   "Ontario",
			PostalCode: "M5V 2H1",
		},
	}

	mockRepo.EXPECT().
		CreateEmployee(gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, model models.CreateEmployeeRow) (*models.CreateEmployeeResponse, error) {
			if model.Province != "Ontario" {
				t.Fatalf("expected province to be Ontario, got %s", model.Province)
			}
			return &models.CreateEmployeeResponse{
				EmployeeId: 10,
			}, nil
		})

	res, err := svc.CreateEmployee(context.Background(), req)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if res.EmployeeId != 10 {
		t.Fatalf("expected employee id 10, got %d", res.EmployeeId)
	}
}

func TestEmployeeService_GetEmployeeContext_CacheAndInvalidate(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	mockRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewEmployeeService(mockRepo, nil, rdb)

	mockRepo.EXPECT().
		GetEmployeeById(gomock.Any(), 42).
		Return(&models.Employee{
			EmployeeId: 42,
			EmployeeBase: models.EmployeeBase{
				Role:         models.RoleSales,
				Email:        "emp42@test.com",
				StoreId:      3,
				IsActive:     func() *bool { b := true; return &b }(),
				IsTerminated: func() *bool { b := false; return &b }(),
			},
		}, nil).
		Times(1)

	ctx1, err := svc.GetEmployeeContext(context.Background(), 42)
	if err != nil {
		t.Fatalf("first GetEmployeeContext failed: %v", err)
	}
	if ctx1.EmployeeId != 42 || ctx1.StoreId != 3 || !ctx1.IsActive || ctx1.IsTerminated {
		t.Fatalf("unexpected context 1: %+v", ctx1)
	}

	ctx2, err := svc.GetEmployeeContext(context.Background(), 42)
	if err != nil {
		t.Fatalf("second GetEmployeeContext failed: %v", err)
	}
	if ctx2.EmployeeId != 42 || ctx2.StoreId != 3 {
		t.Fatalf("unexpected context 2: %+v", ctx2)
	}

	mockRepo.EXPECT().
		TerminateEmployeeById(gomock.Any(), 42).
		Return(nil).
		Times(1)

	_, err = svc.TerminateEmployee(context.Background(), 42)
	if err != nil {
		t.Fatalf("TerminateEmployee failed: %v", err)
	}

	mockRepo.EXPECT().
		GetEmployeeById(gomock.Any(), 42).
		Return(&models.Employee{
			EmployeeId: 42,
			EmployeeBase: models.EmployeeBase{
				Role:         models.RoleSales,
				Email:        "emp42@test.com",
				StoreId:      3,
				IsActive:     func() *bool { b := false; return &b }(),
				IsTerminated: func() *bool { b := true; return &b }(),
			},
		}, nil).
		Times(1)

	ctx3, err := svc.GetEmployeeContext(context.Background(), 42)
	if err != nil {
		t.Fatalf("third GetEmployeeContext failed: %v", err)
	}
	if !ctx3.IsTerminated || ctx3.IsActive {
		t.Fatalf("expected terminated employee context after invalidation, got: %+v", ctx3)
	}
}

func TestEmployeeService_TerminateEmployee_DBFailurePreservesCache(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	mockRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewEmployeeService(mockRepo, nil, rdb)

	mockRepo.EXPECT().
		GetEmployeeById(gomock.Any(), 99).
		Return(&models.Employee{
			EmployeeId: 99,
			EmployeeBase: models.EmployeeBase{
				Role:         models.RoleSales,
				Email:        "emp99@test.com",
				StoreId:      1,
				IsActive:     func() *bool { b := true; return &b }(),
				IsTerminated: func() *bool { b := false; return &b }(),
			},
		}, nil).
		Times(1)

	ctxBefore, err := svc.GetEmployeeContext(context.Background(), 99)
	if err != nil || ctxBefore == nil {
		t.Fatalf("failed to seed employee context cache: %v", err)
	}

	mockRepo.EXPECT().
		TerminateEmployeeById(gomock.Any(), 99).
		Return(errors.New("db connection failure")).
		Times(1)

	_, err = svc.TerminateEmployee(context.Background(), 99)
	if err == nil {
		t.Fatalf("expected error from TerminateEmployee when DB fails")
	}

	cachedCtx, err := svc.GetEmployeeContext(context.Background(), 99)
	if err != nil {
		t.Fatalf("failed to get employee context: %v", err)
	}
	if cachedCtx.IsTerminated || !cachedCtx.IsActive {
		t.Fatalf("expected cached employee context to remain active and unevicted on DB failure")
	}
}
