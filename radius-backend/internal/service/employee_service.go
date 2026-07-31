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
}

func NewEmployeeService(employeeRepo *repository.EmployeeRepo) *EmployeeService {
	return &EmployeeService{
		employeeRepo: employeeRepo,
	}
}

func (e *EmployeeService) GetAllEmployees(ctx context.Context, pageNumber int, pageSize int) (*models.GetAllEmployeesResponse, error) {
	limit := pageSize
	offset := (pageNumber - 1) * pageSize

	employees, totalLength, err := e.employeeRepo.GetAllEmployees(ctx, limit, offset)
	if err != nil {
		return nil, err
	}

	return &models.GetAllEmployeesResponse{
		Employees:   employees,
		TotalLength: totalLength,
		Message:     "Retrieved all existing employees",
	}, nil
}

func (e *EmployeeService) TerminateEmployee(ctx context.Context, employeeId int) (*models.TerminateEmployeeResponse, error) {
	err := e.employeeRepo.TerminateEmployeeById(ctx, employeeId)
	if err != nil {
		return nil, err
	}
	return &models.TerminateEmployeeResponse{
		Message: "Employee Terminated Successfully",
	}, nil
}

func (e *EmployeeService) ActivateEmployee(ctx context.Context, employeeId int) (*models.ActivateEmployeeResponse, error) {
	err := e.employeeRepo.ActivateEmployeeById(ctx, employeeId)
	if err != nil {
		return nil, err
	}
	return &models.ActivateEmployeeResponse{
		Message: "Employee Activated Successfully",
	}, nil
}

func (e *EmployeeService) UpdateEmployee(ctx context.Context, body models.Employee) (*models.UpdateEmployeeResponse, error) {
	if body.IsTerminated != nil && body.IsActive != nil {
		if *body.IsTerminated && *body.IsActive {
			return nil, errors.New("An employee cannot be active while being terminated")
		}
	}

	if err := utils.ValidateCanadianProvince(body.Province); err != nil {
		return nil, err
	}
	normalizedPostal, err := utils.NormalizeCanadianPostalCode(body.PostalCode)
	if err != nil {
		return nil, err
	}
	body.PostalCode = normalizedPostal

	err = e.employeeRepo.UpdateEmployee(ctx, body)
	if err != nil {
		log.Println("Error: " + err.Error())
		return nil, errors.New("error updating this employee")
	}

	return &models.UpdateEmployeeResponse{
		Message: "Updated employee successfully!",
	}, nil
}

func (e *EmployeeService) CreateEmployee(ctx context.Context, model models.CreateEmployeeRequest) (*models.CreateEmployeeResponse, error) {
	if err := utils.ValidateCanadianProvince(model.Province); err != nil {
		return nil, err
	}
	normalizedPostal, err := utils.NormalizeCanadianPostalCode(model.PostalCode)
	if err != nil {
		return nil, err
	}
	model.PostalCode = normalizedPostal

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
