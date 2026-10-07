package service

import (
	"context"
	"errors"
	"radius/internal/models"
	"radius/internal/utils"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func setupSessionTestRedis() *redis.Client {
	s, err := miniredis.Run()
	if err != nil {
		panic(err)
	}
	return redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})
}

type MockSessionRepo struct {
	GetSessionByAccessTokenHashFunc       func(ctx context.Context, accessTokenHash string) (*models.GetSessionByHashedToken, error)
	GetSessionByRefreshTokenHashFunc      func(ctx context.Context, refreshTokenHash string) (*models.GetSessionByHashedToken, error)
	GetSessionByIdFunc                    func(ctx context.Context, id int) (*models.Session, error)
	TerminateSessionByIdFunc              func(ctx context.Context, id int) error
	TerminateSessionByAccessTokenHashFunc func(ctx context.Context, accessTokenHash string) error
	UpdateAccessTokenHashFunc             func(ctx context.Context, sessionId int, newAccessTokenHash string) error
	RotateSessionTokensFunc               func(ctx context.Context, sessionID int, oldRefreshHash, newAccessHash, newRefreshHash string, expiresAt time.Time) (bool, error)
	UpdateSessionExpiryFunc               func(ctx context.Context, sessionId int, newExpiresAt time.Time) error
	CreateSessionFunc                     func(ctx context.Context, model models.CreateSessionRequest) (*models.CreateSessionResponse, error)
	GetSessionsByEmployeeIdFunc           func(ctx context.Context, employeeId int) ([]models.Session, error)
	GetAllSessionsFunc                    func(ctx context.Context, limit, offset int) ([]models.GetAllSessions, int, error)
	TerminateExpiredSessionsFunc          func(ctx context.Context) (int64, error)
}

func (m *MockSessionRepo) GetSessionsByEmployeeId(ctx context.Context, employeeId int) ([]models.Session, error) {
	if m.GetSessionsByEmployeeIdFunc != nil {
		return m.GetSessionsByEmployeeIdFunc(ctx, employeeId)
	}
	return nil, nil
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
func (m *MockSessionRepo) RotateSessionTokens(ctx context.Context, sessionID int, oldRefreshHash, newAccessHash, newRefreshHash string, expiresAt time.Time) (bool, error) {
	if m.RotateSessionTokensFunc != nil {
		return m.RotateSessionTokensFunc(ctx, sessionID, oldRefreshHash, newAccessHash, newRefreshHash, expiresAt)
	}
	return false, nil
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
	db := setupSessionTestRedis()

	sessionService := NewSessionService(mockRepo, secret, db)

	token, _ := utils.GenerateAccessToken(1, "test@test.com", models.RoleAdmin, 1, secret)

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

func TestRefreshAccessToken_RotatesAndRevokesOnReuse(t *testing.T) {
	ctx := context.Background()
	secret := []byte("testsecret")
	redisClient := setupSessionTestRedis()
	defer redisClient.Close()
	oldRefresh, err := utils.GenerateRefreshToken(7, "staff@example.com", models.RoleSales, 2, secret)
	if err != nil {
		t.Fatal(err)
	}
	oldAccess, err := utils.GenerateAccessToken(7, "staff@example.com", models.RoleSales, 2, secret)
	if err != nil {
		t.Fatal(err)
	}
	currentRefreshHash := utils.HashTokenForDB(oldRefresh)
	currentAccessHash := utils.HashTokenForDB(oldAccess)
	terminated := false
	active := true
	terminatedEmployee := false
	repo := &MockSessionRepo{}
	repo.GetSessionByRefreshTokenHashFunc = func(_ context.Context, hash string) (*models.GetSessionByHashedToken, error) {
		if hash != currentRefreshHash || terminated {
			return nil, errors.New("not found")
		}
		return &models.GetSessionByHashedToken{SessionId: 42, EmployeeId: 7, StoreId: 2, AccessTokenHash: currentAccessHash, ExpiresAt: time.Now().Add(time.Hour), IsActive: &active, IsTerminated: &terminatedEmployee}, nil
	}
	repo.RotateSessionTokensFunc = func(_ context.Context, sessionID int, oldHash, newAccessHash, newRefreshHash string, expiresAt time.Time) (bool, error) {
		if sessionID != 42 || oldHash != currentRefreshHash || terminated || expiresAt.Before(time.Now()) {
			return false, nil
		}
		currentRefreshHash = newRefreshHash
		currentAccessHash = newAccessHash
		return true, nil
	}
	repo.GetSessionByIdFunc = func(_ context.Context, id int) (*models.Session, error) {
		return &models.Session{SessionId: id, AccessTokenHash: currentAccessHash}, nil
	}
	repo.TerminateSessionByIdFunc = func(_ context.Context, id int) error {
		terminated = true
		return nil
	}
	svc := NewSessionService(repo, secret, redisClient)
	newAccess, newRefresh, err := svc.RefreshAccessToken(ctx, oldRefresh)
	if err != nil {
		t.Fatal(err)
	}
	if newAccess == oldAccess || newRefresh == oldRefresh || currentRefreshHash != utils.HashTokenForDB(newRefresh) {
		t.Fatal("tokens were not rotated")
	}
	if _, _, err := svc.RefreshAccessToken(ctx, oldRefresh); err == nil || !terminated {
		t.Fatalf("reused refresh token must revoke the session, got %v", err)
	}
	if err := svc.ValidateSession(ctx, newAccess); err == nil {
		t.Fatal("access token remained valid after replay revocation")
	}
}

func TestRefreshAccessToken_RevokesIfReuseTrackingUnavailable(t *testing.T) {
	secret := []byte("testsecret")
	refresh, err := utils.GenerateRefreshToken(7, "staff@example.com", models.RoleSales, 2, secret)
	if err != nil {
		t.Fatal(err)
	}
	active := true
	terminatedEmployee := false
	revoked := false
	repo := &MockSessionRepo{}
	repo.GetSessionByRefreshTokenHashFunc = func(context.Context, string) (*models.GetSessionByHashedToken, error) {
		return &models.GetSessionByHashedToken{SessionId: 42, StoreId: 2, ExpiresAt: time.Now().Add(time.Hour), IsActive: &active, IsTerminated: &terminatedEmployee}, nil
	}
	repo.RotateSessionTokensFunc = func(context.Context, int, string, string, string, time.Time) (bool, error) {
		return true, nil
	}
	repo.GetSessionByIdFunc = func(context.Context, int) (*models.Session, error) {
		return &models.Session{SessionId: 42}, nil
	}
	repo.TerminateSessionByIdFunc = func(context.Context, int) error {
		revoked = true
		return nil
	}
	svc := NewSessionService(repo, secret, nil)
	if _, _, err := svc.RefreshAccessToken(context.Background(), refresh); err == nil || !revoked {
		t.Fatalf("refresh must fail closed without reuse tracking: error=%v revoked=%v", err, revoked)
	}
}

func TestValidateSession_Expired(t *testing.T) {
	mockRepo := &MockSessionRepo{}
	secret := []byte("testsecret")
	db := setupSessionTestRedis()
	sessionService := NewSessionService(mockRepo, secret, db)
	token, _ := utils.GenerateAccessToken(1, "test@test.com", models.RoleAdmin, 1, secret)

	isActive := true
	isTerminated := false

	mockRepo.GetSessionByAccessTokenHashFunc = func(ctx context.Context, accessTokenHash string) (*models.GetSessionByHashedToken, error) {
		return &models.GetSessionByHashedToken{
			SessionId:    1,
			EmployeeId:   1,
			ExpiresAt:    time.Now().Add(-1 * time.Hour),
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
	db := setupSessionTestRedis()
	sessionService := NewSessionService(mockRepo, secret, db)
	token, _ := utils.GenerateAccessToken(1, "test@test.com", models.RoleAdmin, 1, secret)

	mockRepo.GetSessionByAccessTokenHashFunc = func(ctx context.Context, accessTokenHash string) (*models.GetSessionByHashedToken, error) {
		return nil, errors.New("sql: no rows in result set")
	}

	err := sessionService.ValidateSession(context.Background(), token)
	if err == nil {
		t.Errorf("Expected an error for non-existent session")
	}
}

func TestGetAllSessions_CurrentSession(t *testing.T) {
	mockRepo := &MockSessionRepo{}
	secret := []byte("testsecret")
	db := setupSessionTestRedis()
	sessionService := NewSessionService(mockRepo, secret, db)

	token, _ := utils.GenerateAccessToken(1, "admin@test.com", models.RoleAdmin, 1, secret)
	hashedToken := utils.HashTokenForDB(token)

	_ = db.Set(context.Background(), "session:"+hashedToken, 42, 1*time.Hour).Err()

	mockRepo.GetAllSessionsFunc = func(ctx context.Context, limit, offset int) ([]models.GetAllSessions, int, error) {
		return []models.GetAllSessions{
			{SessionId: 10, EmployeeId: 2, Email: "other@test.com"},
			{SessionId: 42, EmployeeId: 1, Email: "admin@test.com"},
		}, 2, nil
	}

	res, err := sessionService.GetAllSessions(context.Background(), 1, 10, token)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if res.CurrentSessionId == nil || *res.CurrentSessionId != 42 {
		t.Errorf("Expected CurrentSessionId to be 42, got %v", res.CurrentSessionId)
	}

	if res.Sessions[0].IsCurrent {
		t.Errorf("Expected session 10 to not be marked current")
	}
	if !res.Sessions[1].IsCurrent {
		t.Errorf("Expected session 42 to be marked current")
	}
}

func TestTerminateSessionById_DeletesRedisKey(t *testing.T) {
	mockRepo := &MockSessionRepo{}
	secret := []byte("testsecret")
	db := setupSessionTestRedis()
	sessionService := NewSessionService(mockRepo, secret, db)

	accessTokenHash := "hashed_access_token_123"
	_ = db.Set(context.Background(), "session:"+accessTokenHash, 42, 1*time.Hour).Err()

	mockRepo.GetSessionByIdFunc = func(ctx context.Context, sessionId int) (*models.Session, error) {
		return &models.Session{
			SessionId:       sessionId,
			EmployeeId:      1,
			AccessTokenHash: accessTokenHash,
		}, nil
	}

	terminatedId := 0
	mockRepo.TerminateSessionByIdFunc = func(ctx context.Context, sessionId int) error {
		terminatedId = sessionId
		return nil
	}

	res, err := sessionService.TerminateSessionById(context.Background(), 42)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Message != "Session deleted successfully" {
		t.Errorf("unexpected message: %s", res.Message)
	}
	if terminatedId != 42 {
		t.Errorf("expected session 42 to be terminated, got %d", terminatedId)
	}

	_, err = db.Get(context.Background(), "session:"+accessTokenHash).Result()
	if err == nil {
		t.Errorf("expected Redis key to be deleted, but it still exists")
	}
}

func TestTerminateAllSessionsByEmployeeId_ClearsAllRedis(t *testing.T) {
	mockRepo := &MockSessionRepo{}
	secret := []byte("testsecret")
	db := setupSessionTestRedis()
	sessionService := NewSessionService(mockRepo, secret, db)

	hash1 := "token_hash_1"
	hash2 := "token_hash_2"
	_ = db.Set(context.Background(), "session:"+hash1, 101, 1*time.Hour).Err()
	_ = db.Set(context.Background(), "session:"+hash2, 102, 1*time.Hour).Err()

	mockRepo.GetSessionsByEmployeeIdFunc = func(ctx context.Context, employeeId int) ([]models.Session, error) {
		return []models.Session{
			{SessionId: 101, EmployeeId: employeeId, AccessTokenHash: hash1},
			{SessionId: 102, EmployeeId: employeeId, AccessTokenHash: hash2},
		}, nil
	}

	terminatedIds := []int{}
	mockRepo.TerminateSessionByIdFunc = func(ctx context.Context, sessionId int) error {
		terminatedIds = append(terminatedIds, sessionId)
		return nil
	}

	sessionService.TerminateAllSessionsByEmployeeId(context.Background(), 7)

	if len(terminatedIds) != 2 {
		t.Fatalf("expected 2 sessions terminated, got %d", len(terminatedIds))
	}

	_, err1 := db.Get(context.Background(), "session:"+hash1).Result()
	if err1 == nil {
		t.Errorf("expected Redis key hash1 to be deleted")
	}

	_, err2 := db.Get(context.Background(), "session:"+hash2).Result()
	if err2 == nil {
		t.Errorf("expected Redis key hash2 to be deleted")
	}
}
