// radius-backend/internal/service/employee_service.go
package service

import (
	"context"
	"radius/internal/models"
	"radius/internal/repository"
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

func (s *EmployeeService) GetAllEmployees(ctx context.Context) (*models.GetAllEmployeesResponse, error) {
	employees, err := s.employeeRepo.GetAllEmployees(ctx)
	if err != nil {
		return nil, err
	}

	return &models.GetAllEmployeesResponse{
		Employees: employees,
		Message:   "Retrieved all existing employees",
	}, nil
}

func (s *EmployeeService) DeleteEmployee(ctx context.Context, employeeId int) (*models.DeleteEmployeeRespnose, error) {
	err := s.employeeRepo.DeleteEmployeeById(ctx, employeeId)
	if err != nil {
		return nil, err
	}
	return &models.DeleteEmployeeRespnose{
		Message: "Session deleted successfully",
	}, nil
}
