package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"radius/internal/middleware"
	"radius/internal/models"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRolePermissionMatrix(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cases := []struct {
		role    models.EmployeeRole
		allowed map[middleware.Permission]bool
	}{
		{models.RoleSales, map[middleware.Permission]bool{middleware.PermViewSalesFloorAction: true, middleware.PermViewBackRoomActions: true}},
		{models.RoleService, map[middleware.Permission]bool{middleware.PermViewSalesFloorAction: true, middleware.PermViewBackRoomActions: true, middleware.PermViewServiceActions: true}},
		{models.RoleManager, map[middleware.Permission]bool{middleware.PermViewSalesFloorAction: true, middleware.PermViewBackRoomActions: true, middleware.PermViewServiceActions: true, middleware.PermViewManagerActions: true}},
		{models.RoleAdmin, map[middleware.Permission]bool{middleware.PermViewSalesFloorAction: true, middleware.PermViewBackRoomActions: true, middleware.PermViewServiceActions: true, middleware.PermViewManagerActions: true, middleware.PermViewAdminActions: true}},
	}
	permissions := []middleware.Permission{
		middleware.PermViewSalesFloorAction,
		middleware.PermViewBackRoomActions,
		middleware.PermViewServiceActions,
		middleware.PermViewManagerActions,
		middleware.PermViewAdminActions,
	}
	for _, tt := range cases {
		for _, permission := range permissions {
			t.Run(string(tt.role)+"/"+string(permission), func(t *testing.T) {
				r := gin.New()
				r.Use(func(ctx *gin.Context) { ctx.Set("role", string(tt.role)); ctx.Next() })
				r.GET("/resource", middleware.RequirePermission(permission), func(ctx *gin.Context) { ctx.Status(http.StatusNoContent) })
				response := httptest.NewRecorder()
				r.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/resource", nil))
				want := http.StatusForbidden
				if tt.allowed[permission] {
					want = http.StatusNoContent
				}
				if response.Code != want {
					t.Fatalf("status %d, want %d", response.Code, want)
				}
			})
		}
	}
}
