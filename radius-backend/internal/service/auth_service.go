package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net"
	"radius/internal/models"
	"radius/internal/utils"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

var (
	ErrInvalidToken      = errors.New("invalid or expired token")
	ErrAccountTerminated = errors.New("terminated account")
	ErrAccountInactive   = errors.New("inactive account")
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

func (s *AuthService) Authenticate(ctx context.Context, tokenString string) (*models.AuthContext, error) {
	token, err := jwt.Parse(tokenString, func(*jwt.Token) (any, error) {
		return s.sessionService.jwtSecret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("%w: unreadable claims", ErrInvalidToken)
	}
	if claims["token_type"] != "access" {
		return nil, fmt.Errorf("%w: not an access token", ErrInvalidToken)
	}
	employeeId, ok := positiveIntClaim(claims, "employee_id")
	if !ok {
		return nil, fmt.Errorf("%w: missing or invalid employee_id claim", ErrInvalidToken)
	}
	if err := s.ValidateSession(ctx, tokenString); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}
	empCtx, err := s.ActiveEmployeeContext(ctx, employeeId)
	if err != nil {
		return nil, err
	}
	email, _ := claims["email"].(string)
	return &models.AuthContext{
		EmployeeId: employeeId,
		Email:      email,
		Role:       empCtx.Role,
		StoreId:    empCtx.StoreId,
	}, nil
}

func AuthErrorMessage(err error) string {
	switch {
	case errors.Is(err, ErrAccountTerminated):
		return "Terminated Account"
	case errors.Is(err, ErrAccountInactive):
		return "Inactive account"
	default:
		return "Invalid or expired token"
	}
}

func (s *AuthService) ActiveEmployeeContext(ctx context.Context, employeeId int) (*models.EmployeeContext, error) {
	empCtx, err := s.GetEmployeeContext(ctx, employeeId)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}
	if empCtx.IsTerminated {
		return nil, ErrAccountTerminated
	}
	if !empCtx.IsActive {
		return nil, ErrAccountInactive
	}
	return empCtx, nil
}

func positiveIntClaim(claims jwt.MapClaims, key string) (int, bool) {
	value, ok := claims[key].(float64)
	if !ok || value <= 0 || value > math.MaxInt32 || value != math.Trunc(value) {
		return 0, false
	}
	return int(value), true
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
