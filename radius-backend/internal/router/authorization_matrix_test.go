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

const (
	roleSales = iota
	roleService
	roleManager
	roleAdmin
)

type protectedRoute struct {
	method      string
	path        string
	minimumRole int
}

var protectedRoutes = []protectedRoute{
	{http.MethodGet, "/api/admin/employees", roleAdmin},
	{http.MethodPost, "/api/admin/employees", roleAdmin},
	{http.MethodPut, "/api/admin/employees/:id", roleAdmin},
	{http.MethodPost, "/api/admin/employees/:id/activate", roleAdmin},
	{http.MethodPost, "/api/admin/employees/:id/terminate", roleAdmin},
	{http.MethodGet, "/api/admin/metrics", roleAdmin},
	{http.MethodGet, "/api/admin/sessions", roleAdmin},
	{http.MethodDelete, "/api/admin/sessions/:id", roleAdmin},
	{http.MethodGet, "/api/admin/stores", roleAdmin},
	{http.MethodPost, "/api/admin/stores", roleAdmin},
	{http.MethodGet, "/api/admin/stores/:id", roleAdmin},
	{http.MethodPut, "/api/admin/stores/:id", roleAdmin},
	{http.MethodPost, "/api/admin/stores/:id/activate", roleAdmin},
	{http.MethodPost, "/api/admin/stores/:id/deactivate", roleAdmin},
	{http.MethodGet, "/api/admin/stores/operations", roleAdmin},
	{http.MethodPost, "/api/logout", roleSales},
	{http.MethodGet, "/api/manager/employees", roleManager},
	{http.MethodGet, "/api/manager/store/:id", roleManager},
	{http.MethodGet, "/api/sales_floor/cycle_counts", roleSales},
	{http.MethodPost, "/api/sales_floor/cycle_counts", roleSales},
	{http.MethodGet, "/api/sales_floor/cycle_counts/:id", roleSales},
	{http.MethodPost, "/api/sales_floor/cycle_counts/:id/approve", roleManager},
	{http.MethodGet, "/api/sales_floor/cycle_counts/:id/items", roleSales},
	{http.MethodPost, "/api/sales_floor/cycle_counts/:id/scans", roleSales},
	{http.MethodPost, "/api/sales_floor/cycle_counts/:id/submit", roleSales},
	{http.MethodPost, "/api/sales_floor/cycle_counts/:id/transfer_ownership", roleManager},
	{http.MethodGet, "/api/sales_floor/cycle_counts/schedule", roleSales},
	{http.MethodPost, "/api/sales_floor/cycle_counts/schedule", roleManager},
	{http.MethodGet, "/api/sales_floor/cycle_counts/search", roleSales},
	{http.MethodGet, "/api/sales_floor/fill_reports", roleSales},
	{http.MethodPost, "/api/sales_floor/fill_reports/empty_hole", roleSales},
	{http.MethodGet, "/api/sales_floor/inventory/adjustments", roleSales},
	{http.MethodPost, "/api/sales_floor/inventory/adjustments", roleSales},
	{http.MethodPost, "/api/sales_floor/inventory/adjustments/review", roleManager},
	{http.MethodPost, "/api/sales_floor/inventory/bin", roleSales},
	{http.MethodPost, "/api/sales_floor/inventory/locations", roleSales},
	{http.MethodGet, "/api/sales_floor/inventory/locations/:id", roleSales},
	{http.MethodPut, "/api/sales_floor/inventory/locations/sync", roleSales},
	{http.MethodGet, "/api/sales_floor/inventory/product", roleSales},
	{http.MethodGet, "/api/sales_floor/inventory/products/:id", roleSales},
	{http.MethodPost, "/api/sales_floor/inventory/quantity", roleSales},
	{http.MethodGet, "/api/sales_floor/is4tc/session", roleSales},
	{http.MethodPost, "/api/sales_floor/is4tc/session/add", roleSales},
	{http.MethodDelete, "/api/sales_floor/is4tc/session/clear", roleSales},
	{http.MethodGet, "/api/sales_floor/orders/online", roleSales},
	{http.MethodPost, "/api/sales_floor/orders/online", roleSales},
	{http.MethodGet, "/api/sales_floor/orders/online/:id", roleSales},
	{http.MethodPut, "/api/sales_floor/orders/online/:id/assign", roleSales},
	{http.MethodPost, "/api/sales_floor/orders/online/:id/cancel", roleSales},
	{http.MethodPost, "/api/sales_floor/orders/online/:id/complete_pick", roleSales},
	{http.MethodPut, "/api/sales_floor/orders/online/:id/items/:item_id", roleSales},
	{http.MethodGet, "/api/sales_floor/orders/print", roleSales},
	{http.MethodGet, "/api/sales_floor/orders/print/:id", roleSales},
	{http.MethodPut, "/api/sales_floor/orders/print/:id/status", roleService},
	{http.MethodGet, "/api/sales_floor/products/:id", roleSales},
	{http.MethodGet, "/api/sales_floor/products/audit", roleSales},
	{http.MethodGet, "/api/sales_floor/products/brands", roleSales},
	{http.MethodGet, "/api/sales_floor/products/categories", roleSales},
	{http.MethodGet, "/api/sales_floor/products/search", roleSales},
	{http.MethodGet, "/api/sales_floor/receiving/purchase_orders", roleSales},
	{http.MethodGet, "/api/sales_floor/receiving/purchase_orders/:id", roleSales},
	{http.MethodGet, "/api/sales_floor/receiving/purchase_orders/:id/check_product", roleSales},
	{http.MethodPost, "/api/sales_floor/receiving/purchase_orders/:id/receive", roleSales},
	{http.MethodPost, "/api/sales_floor/receiving/purchase_orders/:id/receive_lpr", roleSales},
	{http.MethodGet, "/api/sales_floor/receiving/transfers", roleSales},
	{http.MethodGet, "/api/sales_floor/receiving/transfers/:id", roleSales},
	{http.MethodGet, "/api/sales_floor/receiving/transfers/:id/check_product", roleSales},
	{http.MethodPost, "/api/sales_floor/receiving/transfers/:id/quick_receive", roleSales},
	{http.MethodPost, "/api/sales_floor/receiving/transfers/:id/receive", roleSales},
	{http.MethodGet, "/api/sales_floor/returns", roleSales},
	{http.MethodPost, "/api/sales_floor/returns", roleSales},
	{http.MethodGet, "/api/sales_floor/returns/:id", roleSales},
	{http.MethodPost, "/api/sales_floor/returns/:id/approve", roleManager},
	{http.MethodPost, "/api/sales_floor/returns/:id/reject", roleManager},
	{http.MethodGet, "/api/sales_floor/returns/lookup/:id", roleSales},
	{http.MethodGet, "/api/sales_floor/returns/rtv", roleSales},
	{http.MethodGet, "/api/sales_floor/returns/search_by_product", roleSales},
	{http.MethodGet, "/api/sales_floor/transactions", roleSales},
	{http.MethodPost, "/api/sales_floor/transactions", roleAdmin},
	{http.MethodGet, "/api/sales_floor/transactions/:id", roleSales},
	{http.MethodGet, "/api/sales_floor/transfers", roleSales},
	{http.MethodPost, "/api/sales_floor/transfers", roleManager},
	{http.MethodGet, "/api/sales_floor/transfers/:id", roleSales},
	{http.MethodPost, "/api/sales_floor/transfers/:id/cancel", roleManager},
	{http.MethodPost, "/api/sales_floor/transfers/:id/dispatch", roleManager},
	{http.MethodGet, "/api/sales_floor/transfers/stores", roleSales},
	{http.MethodPost, "/api/v1/ws/ticket", roleSales},
	{http.MethodPost, "/api/verify_token", roleSales},
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
	registered := map[string]bool{}
	for _, route := range app.Routes() {
		if strings.HasPrefix(route.Path, "/api/") && route.Path != "/api/refresh_token" && route.Path != "/api/v1/ws" {
			registered[route.Method+" "+route.Path] = true
		}
	}
	expected := map[string]bool{}
	for _, route := range protectedRoutes {
		expected[route.method+" "+route.path] = true
		if !registered[route.method+" "+route.path] {
			t.Errorf("expected route %s %s is not registered", route.method, route.path)
		}
	}
	for route := range registered {
		if !expected[route] {
			t.Errorf("registered route %s is missing from the authorization matrix", route)
		}
	}
	parameter := regexp.MustCompile(`:[a-zA-Z_]+`)
	roles := []models.EmployeeRole{models.RoleSales, models.RoleService, models.RoleManager, models.RoleAdmin}
	requestNumber := 0
	for _, route := range protectedRoutes {
		for level, candidate := range roles {
			requestNumber++
			t.Run(string(candidate)+"/"+route.method+route.path, func(t *testing.T) {
				role = candidate
				token, err := utils.GenerateAccessToken(1, "test@example.invalid", candidate, 1, secret)
				if err != nil {
					t.Fatal(err)
				}
				request := httptest.NewRequest(route.method, parameter.ReplaceAllString(route.path, "1"), nil)
				request.Header.Set("Authorization", "Bearer "+token)
				request.RemoteAddr = fmt.Sprintf("10.%d.%d.%d:1234", requestNumber/65025, requestNumber/255%255, requestNumber%255)
				response := httptest.NewRecorder()
				app.ServeHTTP(response, request)
				if level < route.minimumRole {
					if response.Code != http.StatusForbidden {
						t.Fatalf("status %d, want forbidden", response.Code)
					}
				} else if response.Code == http.StatusUnauthorized || response.Code == http.StatusForbidden || response.Code == http.StatusTooManyRequests {
					t.Fatalf("allowed role got status %d", response.Code)
				}
			})
		}
	}
}
