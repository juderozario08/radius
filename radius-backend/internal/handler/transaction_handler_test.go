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

func TestTransactionHandler_CreateTransaction_NonAdminGets403(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name string
		role models.EmployeeRole
	}{
		{name: "sales", role: models.RoleSales},
		{name: "service", role: models.RoleService},
		{name: "manager", role: models.RoleManager},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			svc := service.NewTransactionService(mocks.NewMockSalesRepository(ctrl), nil, nil, mocks.NewMockFillReportRepository(ctrl))
			h := handler.NewTransactionHandler(svc)

			r := gin.New()
			r.POST("/transactions", func(c *gin.Context) {
				c.Set("role", string(tt.role))
				c.Set("store_id", 3)
				c.Set("employee_id", 42)
				c.Next()
			}, h.CreateTransaction)

			body := `{"register_id":"REG-01","items":[{"product_id":101,"quantity":1}]}`
			req := httptest.NewRequest(http.MethodPost, "/transactions", strings.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusForbidden {
				t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
			}
		})
	}
}
