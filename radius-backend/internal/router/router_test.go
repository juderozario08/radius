package router_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"radius/internal/config"
	"radius/internal/handler"
	"radius/internal/router"
	"radius/internal/service"

	"github.com/gin-gonic/gin"
)

func TestNewRouter_NoPanics(t *testing.T) {
	cfg := &config.Config{
		GinMode: "test",
	}

	appHandlers := testHandlers()

	r := router.NewRouter(router.Config{
		Handlers:    appHandlers,
		AuthService: &service.AuthService{},
		AppConfig:   cfg,
	})

	if r == nil {
		t.Fatal("expected router to not be nil")
	}
}

func TestNewRouter_CORSOrigins(t *testing.T) {
	t.Cleanup(func() { gin.SetMode(gin.TestMode) })

	tests := []struct {
		name           string
		ginMode        string
		allowedOrigins string
		origin         string
		wantAllow      string
	}{
		{"release without origins omits CORS headers", "release", "", "https://app.radius.test", ""},
		{"release allows configured origin", "release", "https://app.radius.test", "https://app.radius.test", "https://app.radius.test"},
		{"release rejects unlisted origin", "release", "https://app.radius.test", "https://evil.example", ""},
		{"debug without origins allows all", "debug", "", "https://app.radius.test", "*"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := router.NewRouter(router.Config{
				Handlers:    testHandlers(),
				AuthService: &service.AuthService{},
				AppConfig: &config.Config{
					GinMode:        tt.ginMode,
					IsRelease:      tt.ginMode == "release",
					AllowedOrigins: tt.allowedOrigins,
				},
			})

			req := httptest.NewRequest(http.MethodGet, "/health", nil)
			req.Header.Set("Origin", tt.origin)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if got := w.Header().Get("Access-Control-Allow-Origin"); got != tt.wantAllow {
				t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, tt.wantAllow)
			}
		})
	}
}

func testHandlers() router.Handlers {
	return router.Handlers{
		AuditHandler:       &handler.AuditHandler{},
		AuthHandler:        &handler.AuthHandler{},
		CategoryHandler:    &handler.CategoryHandler{},
		CycleCountHandler:  &handler.CycleCountHandler{},
		FillReportHandler:  &handler.FillReportHandler{},
		InventoryHandler:   &handler.InventoryHandler{},
		OnlineOrderHandler: &handler.OnlineOrderHandler{},
		ProductHandler:     &handler.ProductHandler{},
		ReceivingHandler:   &handler.ReceivingHandler{},
		StoreHandler:       &handler.StoreHandler{},
		TransactionHandler: &handler.TransactionHandler{},
		TransferHandler:    &handler.TransferHandler{},
		SessionHandler:     &handler.SessionHandler{},
		EmployeeHandler:    &handler.EmployeeHandler{},
		PrintOrderHandler:  &handler.PrintOrderHandler{},
		WSHandler:          &handler.WSHandler{},
		MetricsHandler:     &handler.MetricsHandler{},
	}
}
