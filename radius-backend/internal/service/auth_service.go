package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net"
	"radius/internal/models"
	"radius/internal/repository"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
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

func (s *AuthService) generateToken(id int, email string, role models.EmployeeRole) (string, error) {
	claims := jwt.MapClaims{
		"employee_id": id,
		"email":       email,
		"role":        role,
		"exp":         time.Now().Add(time.Hour * 24).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) hashTokenForDB(token string) string {
	t := sha256.Sum256([]byte(token))
	hash := hex.EncodeToString(t[:])
	return hash
}

func (s *AuthService) hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func (s *AuthService) checkPasswordHash(password string, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func (s *AuthService) Register(ctx context.Context, model models.CreateEmployeeRequest) (*models.CreateEmployeeResponse, error) {
	if model.ConfirmPassword != model.Password {
		return nil, errors.New("password and confirm password do not match")
	}

	hash, err := s.hashPassword(model.Password)
	if err != nil {
		return nil, err
	}

	employee, err := s.employeeRepo.CreateEmployee(ctx, models.CreateEmployeeRow{
		PasswordHash: hash,
		EmployeeBase: models.EmployeeBase{
			Email:      model.Email,
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
	hashedToken := s.hashTokenForDB(tokenString)
	_, err := s.sessionRepo.GetSessionByHashedToken(ctx, hashedToken)
	if err != nil {
		return errors.New("Session not found, expired or logged out")
	}

	return nil
}

func (s *AuthService) createSession(ctx context.Context, employeeId int, role models.EmployeeRole, email string, ipAddress string, storeId int) (string, int, error) {
	token, err := s.generateToken(employeeId, email, role)
	if err != nil {
		return "", -1, err
	}

	tokenHash := s.hashTokenForDB(token)
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
	employee, err := s.employeeRepo.GetByEmailWithSession(ctx, model.Email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("Invalid Credentials")
	}

	if !s.checkPasswordHash(model.Password, employee.PasswordHash) {
		return nil, errors.New("Invalid Credentials")
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

	token, sessionId, err := s.createSession(ctx, employee.EmployeeId, employee.Role, employee.Email, ipAddress, employee.StoreId)
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
	hashedToken := s.hashTokenForDB(tokenString)
	err := s.sessionRepo.DeleteSessionByHashedToken(ctx, hashedToken)
	if err != nil {
		return err
	}
	return nil
}
