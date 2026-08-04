package service

import (
	"context"
	"errors"
	"radius/internal/models"
	"radius/internal/utils"
	"testing"
	"time"
)

// MockSessionRepo is a manual mock implementing SessionRepository for testing.
type MockSessionRepo struct {
	GetSessionByAccessTokenHashFunc       func(ctx context.Context, accessTokenHash string) (*models.GetSessionByHashedToken, error)
	GetSessionByRefreshTokenHashFunc      func(ctx context.Context, refreshTokenHash string) (*models.GetSessionByHashedToken, error)
	GetSessionByIdFunc                    func(ctx context.Context, id int) (*models.Session, error)
	TerminateSessionByIdFunc              func(ctx context.Context, id int) error
	TerminateSessionByAccessTokenHashFunc func(ctx context.Context, accessTokenHash string) error
	UpdateAccessTokenHashFunc             func(ctx context.Context, sessionId int, newAccessTokenHash string) error
	UpdateSessionExpiryFunc               func(ctx context.Context, sessionId int, newExpiresAt time.Time) error
	CreateSessionFunc                     func(ctx context.Context, model models.CreateSessionRequest) (*models.CreateSessionResponse, error)
	GetAllSessionsFunc                    func(ctx context.Context, limit, offset int) ([]models.GetAllSessions, int, error)
	TerminateExpiredSessionsFunc          func(ctx context.Context) (int64, error)
}

func (m *MockSessionRepo) GetSessionByAccessTokenHash(ctx context.Context, accessTokenHash string) (*models.GetSessionByHashedToken, error) {
	if m.GetSessionByAccessTokenHashFunc != nil {
		return m.GetSessionByAccessTokenHashFunc(ctx, accessTokenHash)
	}
	return nil, nil
}
func (m *MockSessionRepo) GetSessionByRefreshTokenHash(ctx context.Context, refreshTokenHash string) (*models.GetSessionByHashedToken, error) {
	if m.GetSessionByRefreshTokenHashFunc != nil {
		return m.GetSessionByRefreshTokenHashFunc(ctx, refreshTokenHash)
	}
	return nil, nil
}
func (m *MockSessionRepo) GetSessionById(ctx context.Context, id int) (*models.Session, error) {
	if m.GetSessionByIdFunc != nil {
		return m.GetSessionByIdFunc(ctx, id)
	}
	return nil, nil
}
func (m *MockSessionRepo) TerminateSessionById(ctx context.Context, id int) error {
	if m.TerminateSessionByIdFunc != nil {
		return m.TerminateSessionByIdFunc(ctx, id)
	}
	return nil
}
func (m *MockSessionRepo) TerminateSessionByAccessTokenHash(ctx context.Context, accessTokenHash string) error {
	if m.TerminateSessionByAccessTokenHashFunc != nil {
		return m.TerminateSessionByAccessTokenHashFunc(ctx, accessTokenHash)
	}
	return nil
}
func (m *MockSessionRepo) UpdateAccessTokenHash(ctx context.Context, sessionId int, newAccessTokenHash string) error {
	if m.UpdateAccessTokenHashFunc != nil {
		return m.UpdateAccessTokenHashFunc(ctx, sessionId, newAccessTokenHash)
	}
	return nil
}
func (m *MockSessionRepo) UpdateSessionExpiry(ctx context.Context, sessionId int, newExpiresAt time.Time) error {
	if m.UpdateSessionExpiryFunc != nil {
		return m.UpdateSessionExpiryFunc(ctx, sessionId, newExpiresAt)
	}
	return nil
}
func (m *MockSessionRepo) CreateSession(ctx context.Context, model models.CreateSessionRequest) (*models.CreateSessionResponse, error) {
	if m.CreateSessionFunc != nil {
		return m.CreateSessionFunc(ctx, model)
	}
	return nil, nil
}
func (m *MockSessionRepo) GetAllSessions(ctx context.Context, limit, offset int) ([]models.GetAllSessions, int, error) {
	if m.GetAllSessionsFunc != nil {
		return m.GetAllSessionsFunc(ctx, limit, offset)
	}
	return nil, 0, nil
}
func (m *MockSessionRepo) TerminateExpiredSessions(ctx context.Context) (int64, error) {
	if m.TerminateExpiredSessionsFunc != nil {
		return m.TerminateExpiredSessionsFunc(ctx)
	}
	return 0, nil
}

func TestValidateSession_Success(t *testing.T) {
	mockRepo := &MockSessionRepo{}

	secret := []byte("testsecret")
	sessionService := NewSessionService(mockRepo, secret)

	// Create a valid token
	token, _ := utils.GenerateAccessToken(1, "test@test.com", models.RoleAdmin, secret)

	// Mock repo returning a valid, active session
	isActive := true
	isTerminated := false
	mockRepo.GetSessionByAccessTokenHashFunc = func(ctx context.Context, accessTokenHash string) (*models.GetSessionByHashedToken, error) {
		return &models.GetSessionByHashedToken{
			SessionId:    1,
			EmployeeId:   1,
			ExpiresAt:    time.Now().Add(1 * time.Hour),
			IsActive:     &isActive,
			IsTerminated: &isTerminated,
		}, nil
	}

	err := sessionService.ValidateSession(context.Background(), token)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

func TestValidateSession_Expired(t *testing.T) {
	mockRepo := &MockSessionRepo{}
	secret := []byte("testsecret")
	sessionService := NewSessionService(mockRepo, secret)
	token, _ := utils.GenerateAccessToken(1, "test@test.com", models.RoleAdmin, secret)

	isActive := true
	isTerminated := false

	// Mock repo returning a session that has expired in the DB
	mockRepo.GetSessionByAccessTokenHashFunc = func(ctx context.Context, accessTokenHash string) (*models.GetSessionByHashedToken, error) {
		return &models.GetSessionByHashedToken{
			SessionId:    1,
			EmployeeId:   1,
			ExpiresAt:    time.Now().Add(-1 * time.Hour), // Expired 1 hour ago
			IsActive:     &isActive,
			IsTerminated: &isTerminated,
		}, nil
	}

	terminateCalled := false
	mockRepo.TerminateSessionByAccessTokenHashFunc = func(ctx context.Context, accessTokenHash string) error {
		terminateCalled = true
		return nil
	}

	err := sessionService.ValidateSession(context.Background(), token)
	if err == nil {
		t.Errorf("Expected an error for expired session")
	}
	if !terminateCalled {
		t.Errorf("Expected TerminateSessionByAccessTokenHash to be called to clean up expired session")
	}
}

func TestValidateSession_NotFound(t *testing.T) {
	mockRepo := &MockSessionRepo{}
	secret := []byte("testsecret")
	sessionService := NewSessionService(mockRepo, secret)
	token, _ := utils.GenerateAccessToken(1, "test@test.com", models.RoleAdmin, secret)

	// Mock repo simulating session not found
	mockRepo.GetSessionByAccessTokenHashFunc = func(ctx context.Context, accessTokenHash string) (*models.GetSessionByHashedToken, error) {
		return nil, errors.New("sql: no rows in result set")
	}

	err := sessionService.ValidateSession(context.Background(), token)
	if err == nil {
		t.Errorf("Expected an error for non-existent session")
	}
}
