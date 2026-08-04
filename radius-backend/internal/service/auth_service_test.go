package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"radius/internal/utils"
	"testing"

	"go.uber.org/mock/gomock"
)

func TestAuthService_Login_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockSessionRepo := mocks.NewMockSessionRepository(ctrl)

	// We need a real SessionService because AuthService depends on it directly
	// instead of an interface (though ideally it should use an interface too).
	jwtSecret := []byte("testsecret")
	sessionService := service.NewSessionService(mockSessionRepo, jwtSecret)

	authService := service.NewAuthService(mockEmployeeRepo, sessionService)

	password := "password123"
	hashedPassword, _ := utils.HashPassword(password)
	
	isActive := true
	isTerminated := false

	// Mock getting the employee
	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmailWithSession(gomock.Any(), "test@test.com").
		Return(&models.GetEmployeeByEmailWithSession{
			EmployeeId:   1,
			PasswordHash: hashedPassword,
			SessionId:    nil, // No active session
			EmployeeBase: models.EmployeeBase{
				Email:        "test@test.com",
				Role:         models.RoleAdmin,
				StoreId:      1,
				IsActive:     &isActive,
				IsTerminated: &isTerminated,
			},
		}, nil)

	// Mock creating a session
	mockSessionRepo.EXPECT().
		CreateSession(gomock.Any(), gomock.Any()).
		Return(&models.CreateSessionResponse{
			SessionId:  100,
			EmployeeId: 1,
			StoreId:    1,
		}, nil)

	result, err := authService.Login(context.Background(), models.EmployeeLoginRequest{
		Email:    "test@test.com",
		Password: password,
		Force:    false,
	}, "127.0.0.1")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if result.RequiresConfirmation {
		t.Fatal("expected no confirmation required")
	}

	if result.Session.EmployeeId != 1 {
		t.Fatalf("expected employee id 1, got %d", result.Session.EmployeeId)
	}
}

func TestAuthService_Login_InvalidPassword(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	
	// sessionRepo is not used because it fails before creating a session
	sessionService := service.NewSessionService(nil, []byte("testsecret"))
	authService := service.NewAuthService(mockEmployeeRepo, sessionService)

	hashedPassword, _ := utils.HashPassword("correctpassword")
	
	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmailWithSession(gomock.Any(), "test@test.com").
		Return(&models.GetEmployeeByEmailWithSession{
			EmployeeId:   1,
			PasswordHash: hashedPassword,
			EmployeeBase: models.EmployeeBase{
				Email: "test@test.com",
			},
		}, nil)

	_, err := authService.Login(context.Background(), models.EmployeeLoginRequest{
		Email:    "test@test.com",
		Password: "wrongpassword",
	}, "127.0.0.1")

	if err == nil {
		t.Fatal("expected an error for invalid credentials")
	}
	if err.Error() != "invalid credentials" {
		t.Fatalf("expected 'invalid credentials', got '%v'", err)
	}
}

func TestAuthService_Login_RequiresConfirmation(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	sessionService := service.NewSessionService(nil, []byte("testsecret"))
	authService := service.NewAuthService(mockEmployeeRepo, sessionService)

	hashedPassword, _ := utils.HashPassword("password123")
	
	isActive := true
	isTerminated := false
	sessionId := 42 // Active session exists

	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmailWithSession(gomock.Any(), "test@test.com").
		Return(&models.GetEmployeeByEmailWithSession{
			EmployeeId:   1,
			PasswordHash: hashedPassword,
			SessionId:    &sessionId,
			EmployeeBase: models.EmployeeBase{
				Email:        "test@test.com",
				IsActive:     &isActive,
				IsTerminated: &isTerminated,
			},
		}, nil)

	result, err := authService.Login(context.Background(), models.EmployeeLoginRequest{
		Email:    "test@test.com",
		Password: "password123",
		Force:    false,
	}, "127.0.0.1")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if !result.RequiresConfirmation {
		t.Fatal("expected confirmation to be required due to existing session")
	}
}
