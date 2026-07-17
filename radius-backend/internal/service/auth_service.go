// radius-backend/internal/service/auth_service.go
package service

import (
	"context"
	"errors"
	"net"
	"radius/internal/models"
	"radius/internal/repository"
	"radius/internal/utils"
	"strings"
	"time"
)

type AuthService struct {
	employeeRepo *repository.EmployeeRepo
	sessionRepo  *repository.SessionRepo
	jwtSecret    []byte
}

func NewAuthService(employeeRepo *repository.EmployeeRepo, sessionRepo *repository.SessionRepo, jwtSecret []byte) *AuthService {
	return &AuthService{
		employeeRepo: employeeRepo,
		sessionRepo:  sessionRepo,
		jwtSecret:    jwtSecret,
	}
}

func (s *AuthService) Register(ctx context.Context, model models.CreateEmployeeRequest) (*models.CreateEmployeeResponse, error) {
	hash, err := utils.HashPassword(model.Password)
	if err != nil {
		return nil, err
	}

	employee, err := s.employeeRepo.CreateEmployee(ctx, models.CreateEmployeeRow{
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

func (s *AuthService) ValidateSession(ctx context.Context, tokenString string) error {
	hashedToken := utils.HashTokenForDB(tokenString)

	session, err := s.sessionRepo.GetSessionByHashedToken(ctx, hashedToken)
	if err != nil {
		return errors.New("Session not found or logged out")
	}

	if time.Now().After(session.ExpiresAt) {
		_ = s.sessionRepo.DeleteSessionByHash(ctx, hashedToken)
		return errors.New("Session expired and has been removed")
	}

	return nil
}

func (s *AuthService) createSession(ctx context.Context, employeeId int, role models.EmployeeRole, email string, ipAddress string, storeId int) (string, int, error) {
	token, err := utils.GenerateToken(employeeId, email, role, s.jwtSecret)
	if err != nil {
		return "", -1, err
	}

	tokenHash := utils.HashTokenForDB(token)
	expiresAt := time.Now().Add(time.Hour * 24)

	session, err := s.sessionRepo.CreateSession(ctx, models.CreateSessionRequest{
		EmployeeId: employeeId,
		StoreId:    storeId,
		IpAddress:  net.ParseIP(ipAddress),
		TokenHash:  tokenHash,
		ExpiresAt:  expiresAt,
	})
	if err != nil {
		return "", -1, err
	}

	return token, session.SessionId, nil
}

func (s *AuthService) Login(ctx context.Context, model models.EmployeeLoginRequest, ipAddress string) (*models.LoginResult, error) {
	email := strings.ToLower(model.Email)
	employee, err := s.employeeRepo.GetEmployeeByEmailWithSession(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("Invalid Credentials")
	}

	if !utils.CheckPasswordHash(model.Password, employee.PasswordHash) {
		return nil, errors.New("Invalid Credentials")
	}

	if employee.IsActive != nil && !(*employee.IsActive) {
		return nil, errors.New("Inactive Account")
	}

	if employee.SessionId != nil && !model.Force {
		return &models.LoginResult{
			RequiresConfirmation: true,
		}, nil
	}

	if employee.SessionId != nil && model.Force {
		if err := s.sessionRepo.DeleteSessionById(ctx, *employee.SessionId); err != nil {
			return nil, err
		}
	}

	token, sessionId, err := s.createSession(ctx, employee.EmployeeId, employee.Role, email, ipAddress, employee.StoreId)
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
	hashedToken := utils.HashTokenForDB(tokenString)
	err := s.sessionRepo.DeleteSessionByHashedToken(ctx, hashedToken)
	if err != nil {
		return err
	}
	return nil
}
