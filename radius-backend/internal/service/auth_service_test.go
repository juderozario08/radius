package service_test

import (
	"context"
	"net"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"radius/internal/utils"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/mock/gomock"
)

func setupAuthTestRedis() *redis.Client {
	s, err := miniredis.Run()
	if err != nil {
		panic(err)
	}
	return redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})
}

func TestAuthService_Login_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockSessionRepo := mocks.NewMockSessionRepository(ctrl)

	jwtSecret := []byte("testsecret")
	db := setupAuthTestRedis()

	sessionService := service.NewSessionService(mockSessionRepo, jwtSecret, db)
	authService := service.NewAuthService(mockEmployeeRepo, sessionService)

	password := "password123"
	hashedPassword, _ := utils.HashPassword(password)

	isActive := true
	isTerminated := false

	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmailWithSession(gomock.Any(), "test@test.com").
		Return(&models.GetEmployeeByEmailWithSession{
			EmployeeId:   1,
			PasswordHash: hashedPassword,
			SessionId:    nil,
			EmployeeBase: models.EmployeeBase{
				Email:        "test@test.com",
				Role:         models.RoleAdmin,
				StoreId:      1,
				IsActive:     &isActive,
				IsTerminated: &isTerminated,
			},
		}, nil)

	mockSessionRepo.EXPECT().
		GetSessionsByEmployeeId(gomock.Any(), 1).
		Return([]models.Session{}, nil).
		AnyTimes()

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

	db := setupAuthTestRedis()
	sessionService := service.NewSessionService(nil, []byte("testsecret"), db)
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

func TestAuthService_Login_RequiresConfirmation_SameIP(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockSessionRepo := mocks.NewMockSessionRepository(ctrl)
	db := setupAuthTestRedis()

	sessionService := service.NewSessionService(mockSessionRepo, []byte("testsecret"), db)
	authService := service.NewAuthService(mockEmployeeRepo, sessionService)

	hashedPassword, _ := utils.HashPassword("password123")

	isActive := true
	isTerminated := false

	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmailWithSession(gomock.Any(), "test@test.com").
		Return(&models.GetEmployeeByEmailWithSession{
			EmployeeId:   1,
			PasswordHash: hashedPassword,
			EmployeeBase: models.EmployeeBase{
				Email:        "test@test.com",
				IsActive:     &isActive,
				IsTerminated: &isTerminated,
			},
		}, nil)

	mockSessionRepo.EXPECT().
		GetSessionsByEmployeeId(gomock.Any(), 1).
		Return([]models.Session{
			{
				SessionId: 42,
				EmployeeId: 1,
				IpAddress: net.ParseIP("127.0.0.1"),
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
		t.Fatal("expected confirmation to be required due to existing session on same IP")
	}
}

func TestAuthService_Login_DifferentIP_AutoLogsOutPreviousSession(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockSessionRepo := mocks.NewMockSessionRepository(ctrl)
	db := setupAuthTestRedis()

	sessionService := service.NewSessionService(mockSessionRepo, []byte("testsecret"), db)
	authService := service.NewAuthService(mockEmployeeRepo, sessionService)

	password := "password123"
	hashedPassword, _ := utils.HashPassword(password)

	isActive := true
	isTerminated := false

	mockEmployeeRepo.EXPECT().
		GetEmployeeByEmailWithSession(gomock.Any(), "test@test.com").
		Return(&models.GetEmployeeByEmailWithSession{
			EmployeeId:   1,
			PasswordHash: hashedPassword,
			EmployeeBase: models.EmployeeBase{
				Email:        "test@test.com",
				Role:         models.RoleAdmin,
				StoreId:      1,
				IsActive:     &isActive,
				IsTerminated: &isTerminated,
			},
		}, nil)

	mockSessionRepo.EXPECT().
		GetSessionsByEmployeeId(gomock.Any(), 1).
		Return([]models.Session{
			{
				SessionId:       42,
				EmployeeId:      1,
				IpAddress:       net.ParseIP("10.0.0.201"),
				AccessTokenHash: "hash123",
			},
		}, nil).
		AnyTimes()

	mockSessionRepo.EXPECT().
		TerminateSessionById(gomock.Any(), 42).
		Return(nil)

	mockSessionRepo.EXPECT().
		CreateSession(gomock.Any(), gomock.Any()).
		Return(&models.CreateSessionResponse{
			SessionId:  101,
			EmployeeId: 1,
			StoreId:    1,
		}, nil)

	result, err := authService.Login(context.Background(), models.EmployeeLoginRequest{
		Email:    "test@test.com",
		Password: password,
		Force:    false,
	}, "10.17.21.28")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if result.RequiresConfirmation {
		t.Fatal("expected no confirmation required when IP is different")
	}

	if result.Session.SessionId != 101 {
		t.Fatalf("expected new session id 101, got %d", result.Session.SessionId)
	}
}
