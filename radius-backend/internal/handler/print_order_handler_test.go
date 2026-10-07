package handler_test

import (
	"net/http"
	"net/http/httptest"
	"radius/internal/handler"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"go.uber.org/mock/gomock"
)

func TestPrintOrderHandler_UpdateStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name    string
		role    models.EmployeeRole
		body    string
		found   bool
		updated bool
		want    int
	}{
		{"invalid body", models.RoleService, `{}`, false, false, http.StatusBadRequest},
		{"forbidden", models.RoleSales, `{"status":"IN PROGRESS"}`, false, false, http.StatusForbidden},
		{"other store", models.RoleService, `{"status":"IN PROGRESS"}`, false, false, http.StatusNotFound},
		{"stale", models.RoleService, `{"status":"IN PROGRESS"}`, true, false, http.StatusConflict},
		{"success", models.RoleService, `{"status":"IN PROGRESS"}`, true, true, http.StatusOK},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			repo := mocks.NewMockOrdersRepository(ctrl)
			if tt.role != models.RoleSales && tt.body != `{}` {
				var order *models.PrintOrder
				if tt.found {
					order = &models.PrintOrder{PrintOrderId: 9, StoreId: 2, Status: models.PrintOrderStatusPending}
				}
				storeID := 2
				repo.EXPECT().GetPrintOrderByID(gomock.Any(), 9, &storeID).Return(order, nil, nil)
				if tt.found {
					repo.EXPECT().UpdatePrintOrderStatus(gomock.Any(), 9, 2, models.PrintOrderStatusPending, models.PrintOrderStatusInProgress).Return(tt.updated, nil)
				}
			}
			r := gin.New()
			r.Use(func(ctx *gin.Context) {
				ctx.Set("role", string(tt.role))
				ctx.Set("store_id", 2)
				ctx.Next()
			})
			r.PUT("/print/:id/status", handler.NewPrintOrderHandler(service.NewPrintOrderService(repo, nil)).UpdateStatus)
			response := httptest.NewRecorder()
			r.ServeHTTP(response, httptest.NewRequest(http.MethodPut, "/print/9/status", strings.NewReader(tt.body)))
			if response.Code != tt.want {
				t.Fatalf("status %d, want %d: %s", response.Code, tt.want, response.Body.String())
			}
		})
	}
}
