package router_test

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"radius/internal/config"
	"radius/internal/models"
	"radius/internal/router"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"radius/internal/utils"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/mock/gomock"
)

func minimumRole(method, path string) int {
	if strings.HasPrefix(path, "/api/admin/") {
		return 3
	}
	if strings.HasPrefix(path, "/api/manager/") {
		return 2
	}
	if !strings.HasPrefix(path, "/api/sales_floor/") {
		return 0
	}
	if method == http.MethodPut && strings.HasSuffix(path, "/print/:id/status") {
		return 1
	}
	if method == http.MethodPost && strings.HasPrefix(path, "/api/sales_floor/transactions") {
		return 3
	}
	if method == http.MethodPost && (strings.HasPrefix(path, "/api/sales_floor/transfers") ||
		strings.HasPrefix(path, "/api/sales_floor/cycle_counts/:id/approve") ||
		strings.HasPrefix(path, "/api/sales_floor/cycle_counts/:id/transfer_ownership") ||
		strings.HasPrefix(path, "/api/sales_floor/cycle_counts/approve") ||
		strings.HasPrefix(path, "/api/sales_floor/cycle_counts/transfer") ||
		strings.HasPrefix(path, "/api/sales_floor/cycle_counts/schedule") ||
		strings.HasPrefix(path, "/api/sales_floor/returns/:id/approve") ||
		strings.HasPrefix(path, "/api/sales_floor/returns/:id/reject") ||
		strings.HasPrefix(path, "/api/sales_floor/returns/approve") ||
		strings.HasPrefix(path, "/api/sales_floor/returns/reject") ||
		path == "/api/sales_floor/inventory/adjustments/review") {
		return 2
	}
	return 0
}

func TestRegisteredRouteRoleMatrix(t *testing.T) {
	secret := []byte("route-matrix-secret-32-bytes-long")
	ctrl := gomock.NewController(t)
	employees := mocks.NewMockEmployeeRepository(ctrl)
	sessions := mocks.NewMockSessionRepository(ctrl)
	active, terminated := true, false
	sessions.EXPECT().GetSessionByAccessTokenHash(gomock.Any(), gomock.Any()).Return(&models.GetSessionByHashedToken{SessionId: 1, ExpiresAt: time.Now().Add(time.Hour), IsActive: &active, IsTerminated: &terminated}, nil).AnyTimes()
	role := models.RoleSales
	employees.EXPECT().GetEmployeeById(gomock.Any(), 1).DoAndReturn(func(_ context.Context, _ int) (*models.Employee, error) {
		return &models.Employee{EmployeeId: 1, EmployeeBase: models.EmployeeBase{Role: role, StoreId: 1, IsActive: &active, IsTerminated: &terminated}}, nil
	}).AnyTimes()
	auth := service.NewAuthService(employees, service.NewSessionService(sessions, secret, nil))
	previousWriter := gin.DefaultWriter
	previousErrorWriter := gin.DefaultErrorWriter
	gin.DefaultWriter = io.Discard
	gin.DefaultErrorWriter = io.Discard
	defer func() {
		gin.DefaultWriter = previousWriter
		gin.DefaultErrorWriter = previousErrorWriter
	}()
	app := router.NewRouter(router.Config{Handlers: testHandlers(), JWTSecret: secret, AuthService: auth, AppConfig: &config.Config{GinMode: "test"}})
	parameter := regexp.MustCompile(`:[a-zA-Z_]+`)
	roles := []models.EmployeeRole{models.RoleSales, models.RoleService, models.RoleManager, models.RoleAdmin}
	requestNumber := 0
	checkedRoutes := 0
	for _, route := range app.Routes() {
		if !strings.HasPrefix(route.Path, "/api/") || strings.Contains(route.Path, "/ws") || route.Path == "/api/refresh_token" {
			continue
		}
		checkedRoutes++
		for level, candidate := range roles {
			requestNumber++
			t.Run(string(candidate)+"/"+route.Method+route.Path, func(t *testing.T) {
				role = candidate
				token, err := utils.GenerateAccessToken(1, "test@example.invalid", candidate, 1, secret)
				if err != nil {
					t.Fatal(err)
				}
				request := httptest.NewRequest(route.Method, parameter.ReplaceAllString(route.Path, "1"), nil)
				request.Header.Set("Authorization", "Bearer "+token)
				request.RemoteAddr = fmt.Sprintf("10.%d.%d.%d:1234", requestNumber/65025, requestNumber/255%255, requestNumber%255)
				response := httptest.NewRecorder()
				app.ServeHTTP(response, request)
				if level < minimumRole(route.Method, route.Path) {
					if response.Code != http.StatusForbidden {
						t.Fatalf("status %d, want forbidden", response.Code)
					}
				} else if response.Code == http.StatusUnauthorized || response.Code == http.StatusForbidden || response.Code == http.StatusTooManyRequests {
					t.Fatalf("allowed role got status %d", response.Code)
				}
			})
		}
	}
	if checkedRoutes < 50 {
		t.Fatalf("only %d protected routes checked", checkedRoutes)
	}
}
