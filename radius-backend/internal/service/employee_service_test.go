package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"

	"go.uber.org/mock/gomock"
)

func TestEmployeeService_GetManagerEmployees_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewEmployeeService(mockRepo)

	managerEmail := "manager@test.com"
	storeId := 5

	// Mock GetEmployeeByEmail
	mockRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), managerEmail).
		Return(&models.Employee{
			EmployeeBase: models.EmployeeBase{
				Email:   managerEmail,
				Role:    models.RoleManager,
				StoreId: storeId,
			},
		}, nil)

	// Mock GetAllEmployees filtered by storeId
	mockRepo.EXPECT().
		GetAllEmployees(gomock.Any(), 10, 0, gomock.Any()).
		Return([]models.Employee{
			{EmployeeId: 1, EmployeeBase: models.EmployeeBase{StoreId: storeId}},
			{EmployeeId: 2, EmployeeBase: models.EmployeeBase{StoreId: storeId}},
		}, 2, nil)

	res, err := svc.GetManagerEmployees(context.Background(), managerEmail, 1, 10)
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

func TestEmployeeService_GetManagerEmployees_NotFound(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewEmployeeService(mockRepo)

	managerEmail := "unknown@test.com"

	mockRepo.EXPECT().
		GetEmployeeByEmail(gomock.Any(), managerEmail).
		Return(nil, nil)

	_, err := svc.GetManagerEmployees(context.Background(), managerEmail, 1, 10)
	if err == nil {
		t.Fatal("expected error for unknown manager")
	}
	if err.Error() != "manager not found" {
		t.Fatalf("expected 'manager not found', got '%v'", err.Error())
	}
}

func TestEmployeeService_UpdateEmployee_InvalidState(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mocks.NewMockEmployeeRepository(ctrl)
	svc := service.NewEmployeeService(mockRepo)

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
	svc := service.NewEmployeeService(mockRepo)

	req := models.CreateEmployeeRequest{
		Password:   "securepass",
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
