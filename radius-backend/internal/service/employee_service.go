// radius-backend/internal/service/employee_service.go
package service

import (
	"context"
	"errors"
	"log"
	"radius/internal/models"
	"radius/internal/utils"
	"strings"
)

type EmployeeService struct {
	employeeRepo EmployeeRepository
}

func NewEmployeeService(employeeRepo EmployeeRepository) *EmployeeService {
	return &EmployeeService{
		employeeRepo: employeeRepo,
	}
}

func (e *EmployeeService) GetAllEmployees(ctx context.Context, pageNumber int, pageSize int, storeId *int) (*models.GetAllEmployeesResponse, error) {
	limit := pageSize
	offset := (pageNumber - 1) * pageSize

	employees, totalLength, err := e.employeeRepo.GetAllEmployees(ctx, limit, offset, storeId)
	if err != nil {
		return nil, err
	}

	return &models.GetAllEmployeesResponse{
		Employees:   employees,
		TotalLength: totalLength,
		Message:     "Retrieved all existing employees",
	}, nil
}

func (e *EmployeeService) GetManagerEmployees(ctx context.Context, email string, pageNumber int, pageSize int) (*models.GetAllEmployeesResponse, error) {
	employee, err := e.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("manager not found")
	}

	limit := pageSize
	offset := (pageNumber - 1) * pageSize

	employees, totalLength, err := e.employeeRepo.GetAllEmployees(ctx, limit, offset, &employee.StoreId)
	if err != nil {
		return nil, err
	}

	return &models.GetAllEmployeesResponse{
		Employees:   employees,
		TotalLength: totalLength,
		Message:     "Retrieved store employees",
	}, nil
}

func (e *EmployeeService) TerminateEmployee(ctx context.Context, employeeId int) (*models.APIMessage, error) {
	err := e.employeeRepo.TerminateEmployeeById(ctx, employeeId)
	if err != nil {
		return nil, err
	}
	return &models.APIMessage{
		Message: "Employee Terminated Successfully",
	}, nil
}

func (e *EmployeeService) ActivateEmployee(ctx context.Context, employeeId int) (*models.APIMessage, error) {
	err := e.employeeRepo.ActivateEmployeeById(ctx, employeeId)
	if err != nil {
		return nil, err
	}
	return &models.APIMessage{
		Message: "Employee Activated Successfully",
	}, nil
}

func (e *EmployeeService) UpdateEmployee(ctx context.Context, body models.Employee) (*models.APIMessage, error) {
	if body.IsTerminated != nil && body.IsActive != nil {
		if *body.IsTerminated && *body.IsActive {
			return nil, errors.New("An employee cannot be active while being terminated")
		}
	}

	province, postalCode, err := utils.SanitizeLocation(body.Province, body.PostalCode)
	if err != nil {
		return nil, err
	}
	body.Province = province
	body.PostalCode = postalCode

	err = e.employeeRepo.UpdateEmployee(ctx, body)
	if err != nil {
		log.Println("Error: " + err.Error())
		return nil, errors.New("error updating this employee")
	}

	return &models.APIMessage{
		Message: "Updated employee successfully!",
	}, nil
}

func (e *EmployeeService) CreateEmployee(ctx context.Context, model models.CreateEmployeeRequest) (*models.CreateEmployeeResponse, error) {
	normalizedProvince, normalizedPostal, err := utils.SanitizeLocation(model.Province, model.PostalCode)
	if err != nil {
		return nil, err
	}
	model.PostalCode = normalizedPostal
	model.Province = normalizedProvince

	hash, err := utils.HashPassword(model.Password)
	if err != nil {
		return nil, err
	}

	employee, err := e.employeeRepo.CreateEmployee(ctx, models.CreateEmployeeRow{
		PasswordHash: hash,
		EmployeeBase: models.EmployeeBase{
			Email:        strings.ToLower(model.Email),
			StoreId:      model.StoreId,
			FirstName:    model.FirstName,
			LastName:     model.LastName,
			Role:         model.Role,
			Phone:        model.Phone,
			Address:      model.Address,
			City:         model.City,
			Province:     model.Province,
			PostalCode:   model.PostalCode,
			IsActive:     model.IsActive,
			IsTerminated: model.IsTerminated,
		},
	})
	if err != nil {
		return nil, err
	}

	return employee, nil
}
