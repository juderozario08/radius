package service

import (
	"context"
	"errors"
	"net"
	"radius/internal/models"
	"radius/internal/utils"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

type AuthService struct {
	employeeRepo    EmployeeRepository
	sessionService  *SessionService
	employeeService *EmployeeService
	redisClient     *redis.Client
}

const dummyPasswordHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

func NewAuthService(employeeRepo EmployeeRepository, sessionService *SessionService, employeeService ...*EmployeeService) *AuthService {
	svc := &AuthService{
		employeeRepo:   employeeRepo,
		sessionService: sessionService,
	}
	if len(employeeService) > 0 && employeeService[0] != nil {
		svc.employeeService = employeeService[0]
	}
	return svc
}

func (s *AuthService) SetEmployeeService(empSvc *EmployeeService) {
	s.employeeService = empSvc
}

func (s *AuthService) SetRedisClient(redisClient *redis.Client) { s.redisClient = redisClient }

func (s *AuthService) loginFailure(ctx context.Context, email string) bool {
	if s.redisClient == nil || email == "" {
		return false
	}
	key := "radius:auth:login-failures:" + email
	count, err := s.redisClient.Incr(ctx, key).Result()
	if err != nil {
		return false
	}
	if count == 1 {
		_ = s.redisClient.Expire(ctx, key, 15*time.Minute).Err()
	}
	return count >= 5
}

func (s *AuthService) GetEmployeeContext(ctx context.Context, employeeId int) (*models.EmployeeContext, error) {
	if s.employeeService != nil {
		return s.employeeService.GetEmployeeContext(ctx, employeeId)
	}
	emp, err := s.employeeRepo.GetEmployeeById(ctx, employeeId)
	if err != nil {
		return nil, err
	}
	if emp == nil {
		return nil, errors.New("employee not found")
	}
	isActive := emp.IsActive != nil && *emp.IsActive
	isTerminated := emp.IsTerminated != nil && *emp.IsTerminated
	return &models.EmployeeContext{
		EmployeeId:   emp.EmployeeId,
		Role:         emp.Role,
		StoreId:      emp.StoreId,
		IsActive:     isActive,
		IsTerminated: isTerminated,
	}, nil
}

func (s *AuthService) ValidateSession(ctx context.Context, tokenString string) error {
	return s.sessionService.ValidateSession(ctx, tokenString)
}

func (s *AuthService) Login(ctx context.Context, model models.EmployeeLoginRequest, ipAddress string) (*models.LoginResult, error) {
	email := strings.ToLower(model.Email)
	if s.redisClient != nil {
		count, err := s.redisClient.Get(ctx, "radius:auth:login-failures:"+email).Int()
		if err == nil && count >= 5 {
			return nil, errors.New("invalid credentials")
		}
	}
	employee, err := s.employeeRepo.GetEmployeeByEmailWithSession(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		_ = utils.CheckPasswordHash(model.Password, dummyPasswordHash)
		s.loginFailure(ctx, email)
		return nil, errors.New("invalid credentials")
	}
	if !utils.CheckPasswordHash(model.Password, employee.PasswordHash) {
		s.loginFailure(ctx, email)
		return nil, errors.New("invalid credentials")
	}
	if employee.IsTerminated != nil && (*employee.IsTerminated) {
		return nil, errors.New("terminated account")
	}
	if employee.IsActive != nil && !(*employee.IsActive) {
		return nil, errors.New("inactive account")
	}
	if s.redisClient != nil {
		_ = s.redisClient.Del(ctx, "radius:auth:login-failures:"+email).Err()
	}

	activeSessions, err := s.sessionService.GetSessionsByEmployeeId(ctx, employee.EmployeeId)
	if err == nil && len(activeSessions) > 0 {
		parsedIP := net.ParseIP(ipAddress)
		hasSameIPSession := false
		for _, sess := range activeSessions {
			if sess.IpAddress != nil && parsedIP != nil && sess.IpAddress.Equal(parsedIP) {
				hasSameIPSession = true
				break
			} else if sess.IpAddress != nil && sess.IpAddress.String() == ipAddress {
				hasSameIPSession = true
				break
			}
		}

		if hasSameIPSession && !model.Force {
			return &models.LoginResult{RequiresConfirmation: true}, nil
		}
	}

	accessToken, refreshToken, sessionId, err := s.sessionService.CreateSession(ctx, employee.EmployeeId, employee.Role, email, ipAddress, employee.StoreId)
	if err != nil {
		return nil, err
	}

	return &models.LoginResult{
		RequiresConfirmation: false,
		Session: &models.EmployeeLoginResponse{
			Token:        accessToken,
			RefreshToken: refreshToken,
			SessionId:    sessionId,
			EmployeeId:   employee.EmployeeId,
			LastName:     employee.LastName,
			Role:         employee.Role,
			StoreId:      employee.StoreId,
		},
	}, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshTokenString string) (*models.RefreshTokenResponse, error) {
	newAccessToken, newRefreshToken, err := s.sessionService.RefreshAccessToken(ctx, refreshTokenString)
	if err != nil {
		return nil, err
	}
	return &models.RefreshTokenResponse{Token: newAccessToken, RefreshToken: newRefreshToken}, nil
}

func (s *AuthService) Logout(ctx context.Context, tokenString string) error {
	return s.sessionService.Logout(ctx, tokenString)
}
