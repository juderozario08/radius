package service

import (
	"context"
	"errors"
	"radius/internal/models"
	"radius/internal/repository"
	"radius/internal/utils"
	"strings"
)

type AuthService struct {
	employeeRepo   *repository.EmployeeRepo
	sessionService *SessionService
}

func NewAuthService(employeeRepo *repository.EmployeeRepo, sessionService *SessionService) *AuthService {
	return &AuthService{
		employeeRepo:   employeeRepo,
		sessionService: sessionService,
	}
}

func (s *AuthService) ValidateSession(ctx context.Context, tokenString string) error {
	return s.sessionService.ValidateSession(ctx, tokenString)
}

func (s *AuthService) Login(ctx context.Context, model models.EmployeeLoginRequest, ipAddress string) (*models.LoginResult, error) {
	email := strings.ToLower(model.Email)
	employee, err := s.employeeRepo.GetEmployeeByEmailWithSession(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("invalid credentials")
	}
	if !utils.CheckPasswordHash(model.Password, employee.PasswordHash) {
		return nil, errors.New("invalid credentials")
	}
	if employee.IsTerminated != nil && (*employee.IsTerminated) {
		return nil, errors.New("terminated account")
	}
	if employee.IsActive != nil && !(*employee.IsActive) {
		return nil, errors.New("inactive account")
	}

	if employee.SessionId != nil && !model.Force {
		return &models.LoginResult{RequiresConfirmation: true}, nil
	}
	if employee.SessionId != nil && model.Force {
		if _, err := s.sessionService.TerminateSessionById(ctx, *employee.SessionId); err != nil {
			return nil, err
		}
	}

	token, sessionId, err := s.sessionService.CreateSession(ctx, employee.EmployeeId, employee.Role, email, ipAddress, employee.StoreId)
	if err != nil {
		return nil, err
	}

	return &models.LoginResult{
		RequiresConfirmation: false,
		Session: &models.EmployeeLoginResponse{
			Token:      token,
			SessionId:  sessionId,
			EmployeeId: employee.EmployeeId,
			LastName:   employee.LastName,
			Role:       employee.Role,
			StoreId:    employee.StoreId,
		},
	}, nil
}

func (s *AuthService) Logout(ctx context.Context, tokenString string) error {
	return s.sessionService.Logout(ctx, tokenString)
}
