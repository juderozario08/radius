package handler_test

import (
	"database/sql"
	"errors"
	"net/http"
	"net/http/httptest"
	"radius/internal/handler"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"radius/internal/utils"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/mock/gomock"
)

func TestAuthHandler_RefreshToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := []byte("testsecret")
	refresh, err := utils.GenerateRefreshToken(7, "staff@example.com", models.RoleSales, 2, secret)
	if err != nil {
		t.Fatal(err)
	}
	access, err := utils.GenerateAccessToken(7, "staff@example.com", models.RoleSales, 2, secret)
	if err != nil {
		t.Fatal(err)
	}
	refreshHash := utils.HashTokenForDB(refresh)
	yes, no := true, false
	session := func(expiresIn time.Duration, active, terminated *bool) *models.GetSessionByHashedToken {
		return &models.GetSessionByHashedToken{SessionId: 42, EmployeeId: 7, StoreId: 2, ExpiresAt: time.Now().Add(expiresIn), IsActive: active, IsTerminated: terminated}
	}
	expectTerminate := func(repo *mocks.MockSessionRepository) {
		repo.EXPECT().GetSessionById(gomock.Any(), 42).Return(&models.Session{SessionId: 42}, nil)
		repo.EXPECT().TerminateSessionById(gomock.Any(), 42).Return(nil)
	}
	dbDown := errors.New("connection refused")

	tests := []struct {
		name          string
		token         string
		setup         func(repo *mocks.MockSessionRepository, mr *miniredis.Miniredis)
		want          int
		wantTerminate bool
	}{
		{name: "malformed token", token: "not-a-jwt", want: http.StatusUnauthorized},
		{name: "access token used as refresh", token: access, want: http.StatusUnauthorized},
		{
			name:  "session not found",
			token: refresh,
			setup: func(repo *mocks.MockSessionRepository, _ *miniredis.Miniredis) {
				repo.EXPECT().GetSessionByRefreshTokenHash(gomock.Any(), refreshHash).Return(nil, sql.ErrNoRows)
			},
			want: http.StatusUnauthorized,
		},
		{
			name:  "reused refresh token",
			token: refresh,
			setup: func(repo *mocks.MockSessionRepository, mr *miniredis.Miniredis) {
				if err := mr.Set("radius:auth:used-refresh:"+refreshHash, "42"); err != nil {
					t.Fatal(err)
				}
				repo.EXPECT().GetSessionByRefreshTokenHash(gomock.Any(), refreshHash).Return(nil, sql.ErrNoRows)
				expectTerminate(repo)
			},
			want:          http.StatusUnauthorized,
			wantTerminate: true,
		},
		{
			name:  "concurrent rotation",
			token: refresh,
			setup: func(repo *mocks.MockSessionRepository, _ *miniredis.Miniredis) {
				repo.EXPECT().GetSessionByRefreshTokenHash(gomock.Any(), refreshHash).Return(session(time.Hour, &yes, &no), nil)
				repo.EXPECT().RotateSessionTokens(gomock.Any(), 42, refreshHash, gomock.Any(), gomock.Any(), gomock.Any()).Return(false, nil)
				expectTerminate(repo)
			},
			want:          http.StatusUnauthorized,
			wantTerminate: true,
		},
		{
			name:  "terminated employee",
			token: refresh,
			setup: func(repo *mocks.MockSessionRepository, _ *miniredis.Miniredis) {
				repo.EXPECT().GetSessionByRefreshTokenHash(gomock.Any(), refreshHash).Return(session(time.Hour, &yes, &yes), nil)
				repo.EXPECT().TerminateSessionById(gomock.Any(), 42).Return(nil)
			},
			want: http.StatusUnauthorized,
		},
		{
			name:  "inactive employee",
			token: refresh,
			setup: func(repo *mocks.MockSessionRepository, _ *miniredis.Miniredis) {
				repo.EXPECT().GetSessionByRefreshTokenHash(gomock.Any(), refreshHash).Return(session(time.Hour, &no, &no), nil)
				repo.EXPECT().TerminateSessionById(gomock.Any(), 42).Return(nil)
			},
			want: http.StatusUnauthorized,
		},
		{
			name:  "expired session",
			token: refresh,
			setup: func(repo *mocks.MockSessionRepository, _ *miniredis.Miniredis) {
				repo.EXPECT().GetSessionByRefreshTokenHash(gomock.Any(), refreshHash).Return(session(-time.Minute, &yes, &no), nil)
				repo.EXPECT().TerminateSessionById(gomock.Any(), 42).Return(nil)
			},
			want: http.StatusUnauthorized,
		},
		{
			name:  "database error on lookup",
			token: refresh,
			setup: func(repo *mocks.MockSessionRepository, _ *miniredis.Miniredis) {
				repo.EXPECT().GetSessionByRefreshTokenHash(gomock.Any(), refreshHash).Return(nil, dbDown)
			},
			want: http.StatusInternalServerError,
		},
		{
			name:  "database and redis down on lookup",
			token: refresh,
			setup: func(repo *mocks.MockSessionRepository, mr *miniredis.Miniredis) {
				mr.Close()
				repo.EXPECT().GetSessionByRefreshTokenHash(gomock.Any(), refreshHash).Return(nil, dbDown)
			},
			want: http.StatusInternalServerError,
		},
		{
			name:  "database error on rotation",
			token: refresh,
			setup: func(repo *mocks.MockSessionRepository, _ *miniredis.Miniredis) {
				repo.EXPECT().GetSessionByRefreshTokenHash(gomock.Any(), refreshHash).Return(session(time.Hour, &yes, &no), nil)
				repo.EXPECT().RotateSessionTokens(gomock.Any(), 42, refreshHash, gomock.Any(), gomock.Any(), gomock.Any()).Return(false, dbDown)
			},
			want: http.StatusInternalServerError,
		},
		{
			name:  "redis error recording rotation",
			token: refresh,
			setup: func(repo *mocks.MockSessionRepository, mr *miniredis.Miniredis) {
				mr.Close()
				repo.EXPECT().GetSessionByRefreshTokenHash(gomock.Any(), refreshHash).Return(session(time.Hour, &yes, &no), nil)
				repo.EXPECT().RotateSessionTokens(gomock.Any(), 42, refreshHash, gomock.Any(), gomock.Any(), gomock.Any()).Return(true, nil)
				expectTerminate(repo)
			},
			want: http.StatusInternalServerError,
		},
		{
			name:  "success",
			token: refresh,
			setup: func(repo *mocks.MockSessionRepository, _ *miniredis.Miniredis) {
				repo.EXPECT().GetSessionByRefreshTokenHash(gomock.Any(), refreshHash).Return(session(time.Hour, &yes, &no), nil)
				repo.EXPECT().RotateSessionTokens(gomock.Any(), 42, refreshHash, gomock.Any(), gomock.Any(), gomock.Any()).Return(true, nil)
			},
			want: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			mr := miniredis.RunT(t)
			redisClient := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
			defer redisClient.Close()

			repo := mocks.NewMockSessionRepository(ctrl)
			if tt.setup != nil {
				tt.setup(repo, mr)
			}
			h := handler.NewAuthHandler(service.NewAuthService(nil, service.NewSessionService(repo, secret, redisClient)))

			r := gin.New()
			r.POST("/auth/refresh", h.RefreshToken)
			req := httptest.NewRequest(http.MethodPost, "/auth/refresh", strings.NewReader(`{"refresh_token":"`+tt.token+`"}`))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.want {
				t.Fatalf("expected %d, got %d: %s", tt.want, w.Code, w.Body.String())
			}
			if tt.wantTerminate && !mr.Exists("radius:auth:revoked:"+strconv.Itoa(42)) {
				t.Fatal("expected session 42 to be revoked")
			}
		})
	}
}
