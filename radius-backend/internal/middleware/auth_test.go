package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"radius/internal/middleware"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"radius/internal/utils"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/mock/gomock"
)

func TestRequireAuthTokenCases(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := []byte("test-secret-for-auth-middleware-32-bytes")
	for _, tc := range []struct {
		name       string
		token      func() string
		terminated bool
		want       int
	}{
		{"missing", func() string { return "" }, false, http.StatusUnauthorized},
		{"malformed", func() string { return "not-a-jwt" }, false, http.StatusUnauthorized},
		{"expired", func() string {
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"token_type": "access", "employee_id": 1, "exp": time.Now().Add(-time.Minute).Unix()})
			signed, _ := token.SignedString(secret)
			return signed
		}, false, http.StatusUnauthorized},
		{"refresh", func() string {
			token, _ := utils.GenerateRefreshToken(1, "test@example.invalid", models.RoleSales, 1, secret)
			return token
		}, false, http.StatusUnauthorized},
		{"terminated", func() string {
			token, _ := utils.GenerateAccessToken(1, "test@example.invalid", models.RoleSales, 1, secret)
			return token
		}, true, http.StatusUnauthorized},
		{"valid", func() string {
			token, _ := utils.GenerateAccessToken(1, "test@example.invalid", models.RoleSales, 1, secret)
			return token
		}, false, http.StatusNoContent},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			employees := mocks.NewMockEmployeeRepository(ctrl)
			sessions := mocks.NewMockSessionRepository(ctrl)
			if tc.name == "terminated" || tc.name == "valid" {
				active := true
				terminated := tc.terminated
				sessionTerminated := false
				sessions.EXPECT().GetSessionByAccessTokenHash(gomock.Any(), gomock.Any()).Return(&models.GetSessionByHashedToken{SessionId: 1, ExpiresAt: time.Now().Add(time.Hour), IsActive: &active, IsTerminated: &sessionTerminated}, nil)
				employees.EXPECT().GetEmployeeById(gomock.Any(), 1).Return(&models.Employee{EmployeeId: 1, EmployeeBase: models.EmployeeBase{StoreId: 1, Role: models.RoleSales, IsActive: &active, IsTerminated: &terminated}}, nil)
			}
			auth := service.NewAuthService(employees, service.NewSessionService(sessions, secret, nil))
			r := gin.New()
			r.GET("/guarded", middleware.RequireAuth(secret, auth), func(c *gin.Context) { c.Status(http.StatusNoContent) })
			request := httptest.NewRequest(http.MethodGet, "/guarded", nil)
			if token := tc.token(); token != "" {
				request.Header.Set("Authorization", "Bearer "+token)
			}
			response := httptest.NewRecorder()
			r.ServeHTTP(response, request)
			if response.Code != tc.want {
				t.Fatalf("status %d, want %d", response.Code, tc.want)
			}
		})
	}
}
