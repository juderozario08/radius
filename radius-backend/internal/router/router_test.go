package router_test

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"radius/internal/config"
	"radius/internal/handler"
	"radius/internal/logging"
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

func TestNewRouter_StatusPropagation(t *testing.T) {
	var logs bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(logging.New(&logs, "release", "debug"))
	t.Cleanup(func() { slog.SetDefault(prev) })

	r := router.NewRouter(router.Config{
		Handlers:    testHandlers(),
		AuthService: &service.AuthService{},
		AppConfig:   &config.Config{GinMode: "test"},
	})

	healthReq := httptest.NewRequest(http.MethodGet, "/health", nil)
	healthRes := httptest.NewRecorder()
	r.ServeHTTP(healthRes, healthReq)
	etag := healthRes.Header().Get("ETag")
	if healthRes.Code != http.StatusOK || etag == "" {
		t.Fatalf("GET /health = %d with ETag %q, want 200 with ETag", healthRes.Code, etag)
	}

	tests := []struct {
		name        string
		method      string
		target      string
		ifNoneMatch string
		wantStatus  int
		wantError   string
	}{
		{name: "unknown GET", method: http.MethodGet, target: "/api/does-not-exist", wantStatus: http.StatusNotFound, wantError: "Route not found"},
		{name: "unknown POST", method: http.MethodPost, target: "/api/does-not-exist", wantStatus: http.StatusNotFound, wantError: "Route not found"},
		{name: "ETag match returns 304", method: http.MethodGet, target: "/health", ifNoneMatch: etag, wantStatus: http.StatusNotModified},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logs.Reset()
			req := httptest.NewRequest(tt.method, tt.target, nil)
			if tt.ifNoneMatch != "" {
				req.Header.Set("If-None-Match", tt.ifNoneMatch)
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", w.Code, tt.wantStatus)
			}
			if tt.wantError != "" {
				var body map[string]string
				if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
					t.Fatalf("body is not json: %v (%q)", err, w.Body.String())
				}
				if body["error"] != tt.wantError {
					t.Fatalf("error = %q, want %q", body["error"], tt.wantError)
				}
				if body["request_id"] == "" {
					t.Fatalf("expected non-empty request_id in error body")
				}
			} else if w.Body.Len() > 0 {
				t.Fatalf("expected empty body, got %q", w.Body.String())
			}

			var record map[string]any
			if err := json.Unmarshal(logs.Bytes(), &record); err != nil {
				t.Fatalf("access log is not a single JSON record: %v (%q)", err, logs.String())
			}
			if record["status"] != float64(tt.wantStatus) {
				t.Fatalf("logged status = %v, want %d", record["status"], tt.wantStatus)
			}
		})
	}
}
