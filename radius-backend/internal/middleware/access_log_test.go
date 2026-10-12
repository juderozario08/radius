package middleware

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"radius/internal/logging"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAccessLogMiddleware(t *testing.T) {
	tests := []struct {
		name         string
		level        string
		route        string
		target       string
		status       int
		setEmployee  bool
		wantLogged   bool
		wantPath     string
		wantLevel    string
		wantEmployee bool
	}{
		{name: "logs route template not raw path", level: "info", route: "/items/:id", target: "/items/42?token=secret", status: http.StatusOK, setEmployee: true, wantLogged: true, wantPath: "/items/:id", wantLevel: "INFO", wantEmployee: true},
		{name: "server error logged at error", level: "info", route: "/boom", target: "/boom", status: http.StatusInternalServerError, wantLogged: true, wantPath: "/boom", wantLevel: "ERROR"},
		{name: "unmatched route uses path without query", level: "info", route: "/known", target: "/unknown?x=1", status: http.StatusNotFound, wantLogged: true, wantPath: "/unknown", wantLevel: "INFO"},
		{name: "health skipped at info", level: "info", route: "/health", target: "/health", status: http.StatusOK, wantLogged: false},
		{name: "ready skipped at info", level: "info", route: "/ready", target: "/ready", status: http.StatusOK, wantLogged: false},
		{name: "health logged at debug", level: "debug", route: "/health", target: "/health", status: http.StatusOK, wantLogged: true, wantPath: "/health", wantLevel: "DEBUG"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			gin.SetMode(gin.TestMode)
			r := gin.New()
			r.Use(RequestID(), AccessLog(logging.New(&buf, "release", tt.level)))
			r.GET(tt.route, func(c *gin.Context) {
				if tt.setEmployee {
					c.Set("employee_id", 7)
				}
				c.Status(tt.status)
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest(http.MethodGet, tt.target, nil)
			r.ServeHTTP(w, req)

			if !tt.wantLogged {
				if buf.Len() != 0 {
					t.Fatalf("expected no log output, got %q", buf.String())
				}
				return
			}

			var record map[string]any
			if err := json.Unmarshal(buf.Bytes(), &record); err != nil {
				t.Fatalf("output is not a single JSON record: %v (%q)", err, buf.String())
			}
			if record["level"] != tt.wantLevel {
				t.Fatalf("level = %v, want %s", record["level"], tt.wantLevel)
			}
			if record["path"] != tt.wantPath {
				t.Fatalf("path = %v, want %s", record["path"], tt.wantPath)
			}
			if record["status"] != float64(tt.status) {
				t.Fatalf("status = %v, want %d", record["status"], tt.status)
			}
			if record["method"] != http.MethodGet {
				t.Fatalf("method = %v", record["method"])
			}
			if _, ok := record["latency_ms"]; !ok {
				t.Fatal("missing latency_ms")
			}
			if record[logging.RequestIDKey] != w.Header().Get(RequestIDHeader) {
				t.Fatalf("request_id = %v, want %s", record[logging.RequestIDKey], w.Header().Get(RequestIDHeader))
			}
			if _, ok := record["employee_id"]; ok != tt.wantEmployee {
				t.Fatalf("employee_id present = %v, want %v", ok, tt.wantEmployee)
			}
		})
	}
}
