package service

import (
	"context"
	"errors"
	"log"
	"net/mail"
	"radius/internal/models"
	"radius/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	EmployeeRepo *repository.EmployeeRepo
	SessionRepo  *repository.SessionRepo
	JWTSecret    []byte
}

func NewAuthService(employeeRepo *repository.EmployeeRepo, sessionRepo *repository.SessionRepo, jwtSecret []byte) *AuthService {
	return &AuthService{
		EmployeeRepo: employeeRepo,
		SessionRepo:  sessionRepo,
		JWTSecret:    jwtSecret,
	}
}

func (s *AuthService) hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func (s *AuthService) checkPasswordHash(password string, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func (s *AuthService) Register(ctx context.Context, model models.CreateEmployeeRequest) (*models.Employee, error) {
	if model.ConfirmPassword != model.Password {
		return nil, errors.New("password and confirm password do not match")
	}

	hash, err := s.hashPassword(model.Password)
	if err != nil {
		return nil, err
	}

	employee, err := s.EmployeeRepo.CreateEmployee(ctx, models.CreateEmployee{
		Email:        model.Email,
		StoreId:      model.StoreId,
		FirstName:    model.FirstName,
		LastName:     model.LastName,
		Role:         model.Role,
		PasswordHash: hash,
		Phone:        model.Phone,
		Address:      model.Address,
		City:         model.City,
		Province:     model.Province,
		PostalCode:   model.PostalCode,
		IsActive:     model.IsActive,
	})
	if err != nil {
		return nil, err
	}

	return employee, nil
}

func (s *AuthService) Login(ctx context.Context) {
}

func checkEmailPattern(email string) bool {
	_, err := mail.ParseAddress(email)
	if err != nil {
		log.Printf("%v is invalid: %v\n", email, err)
		return false
	}
	return true
}

func (s *AuthService) Logout(ctx context.Context) {
}
