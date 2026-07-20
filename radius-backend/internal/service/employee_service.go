// radius-backend/internal/service/employee_service.go
package service

import (
	"context"
	"errors"
	"log"
	"radius/internal/models"
	"radius/internal/repository"
	"radius/internal/utils"
	"strings"
)

type EmployeeService struct {
	employeeRepo *repository.EmployeeRepo
	jwtSecret    []byte
}

func NewEmployeeService(employeeRepo *repository.EmployeeRepo) *EmployeeService {
	return &EmployeeService{
		employeeRepo: employeeRepo,
	}
}

func (e *EmployeeService) GetAllEmployees(ctx context.Context) (*models.GetAllEmployeesResponse, error) {
	employees, err := e.employeeRepo.GetAllEmployees(ctx)
	if err != nil {
		return nil, err
	}

	return &models.GetAllEmployeesResponse{
		Employees: employees,
		Message:   "Retrieved all existing employees",
	}, nil
}

func (e *EmployeeService) TerminateEmployee(ctx context.Context, employeeId int) (*models.TerminateEmployeeRespnose, error) {
	err := e.employeeRepo.TerminateEmployeeById(ctx, employeeId)
	if err != nil {
		return nil, err
	}
	return &models.TerminateEmployeeRespnose{
		Message: "Employee Terminated Successfully",
	}, nil
}

func (e *EmployeeService) ActivateEmployee(ctx context.Context, employeeId int) (*models.ActivateEmployeeRespnose, error) {
	err := e.employeeRepo.ActivateEmployeeById(ctx, employeeId)
	if err != nil {
		return nil, err
	}
	return &models.ActivateEmployeeRespnose{
		Message: "Employee Activated Successfully",
	}, nil
}

func (e *EmployeeService) UpdateEmployee(ctx context.Context, body models.Employee) (*models.UpdateEmployeeResponse, error) {
	if body.IsTerminated != nil && body.IsActive != nil {
		if *body.IsTerminated && *body.IsActive {
			return nil, errors.New("An employee cannot be active while being terminated")
		}
	}

	err := e.employeeRepo.UpdateEmployee(ctx, body)
	if err != nil {
		log.Println("Error: " + err.Error())
		return nil, errors.New("error updating this employee")
	}

	return &models.UpdateEmployeeResponse{
		Message: "Updated employee successfully!",
	}, nil
}

func (e *EmployeeService) CreateEmployee(ctx context.Context, model models.CreateEmployeeRequest) (*models.CreateEmployeeResponse, error) {
	hash, err := utils.HashPassword(model.Password)
	if err != nil {
		return nil, err
	}

	employee, err := e.employeeRepo.CreateEmployee(ctx, models.CreateEmployeeRow{
		PasswordHash: hash,
		EmployeeBase: models.EmployeeBase{
			Email:      strings.ToLower(model.Email),
			StoreId:    model.StoreId,
			FirstName:  model.FirstName,
			LastName:   model.LastName,
			Role:       model.Role,
			Phone:      model.Phone,
			Address:    model.Address,
			City:       model.City,
			Province:   model.Province,
			PostalCode: model.PostalCode,
			IsActive:   model.IsActive,
		},
	})
	if err != nil {
		return nil, err
	}

	return employee, nil
}
