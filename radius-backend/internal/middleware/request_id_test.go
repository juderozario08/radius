package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"radius/internal/logging"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequestIDMiddleware(t *testing.T) {
	tests := []struct {
		name     string
		incoming string
		wantSame bool
	}{
		{name: "generates when absent", incoming: "", wantSame: false},
		{name: "propagates valid incoming id", incoming: "abc-123_DEF.456", wantSame: true},
		{name: "rejects over-long id", incoming: strings.Repeat("a", maxRequestIDLength+1), wantSame: false},
		{name: "rejects unsafe characters", incoming: "abc\"; drop", wantSame: false},
		{name: "rejects newline injection", incoming: "abc\nforged=1", wantSame: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			r := gin.New()
			r.Use(RequestID())

			var ctxID, ginID string
			r.GET("/test", func(c *gin.Context) {
				ctxID = logging.RequestID(c.Request.Context())
				ginID = c.GetString(logging.RequestIDKey)
				c.Status(http.StatusOK)
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest(http.MethodGet, "/test", nil)
			if tt.incoming != "" {
				req.Header.Set(RequestIDHeader, tt.incoming)
			}
			r.ServeHTTP(w, req)

			headerID := w.Header().Get(RequestIDHeader)
			if !validRequestID(headerID) {
				t.Fatalf("response header %q is not a valid request id", headerID)
			}
			if ctxID != headerID || ginID != headerID {
				t.Fatalf("context id %q / gin id %q do not match header %q", ctxID, ginID, headerID)
			}
			if (headerID == tt.incoming) != tt.wantSame {
				t.Fatalf("header %q vs incoming %q: wantSame=%v", headerID, tt.incoming, tt.wantSame)
			}
		})
	}
}

func TestRequestIDMiddleware_GeneratesUniqueIDs(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestID())
	r.GET("/test", func(c *gin.Context) { c.Status(http.StatusOK) })

	seen := map[string]bool{}
	for range 5 {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/test", nil)
		r.ServeHTTP(w, req)
		id := w.Header().Get(RequestIDHeader)
		if seen[id] {
			t.Fatalf("duplicate request id %q", id)
		}
		seen[id] = true
	}
}

func TestRequestIDMiddleware_InjectsRequestIDInErrorBodies(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestID())

	r.GET("/error-struct", func(c *gin.Context) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "something failed"})
	})
	r.GET("/error-existing", func(c *gin.Context) {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden", "request_id": "custom-id"})
	})

	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodGet, "/error-struct", nil)
	req1.Header.Set(RequestIDHeader, "req-fixed-123")
	r.ServeHTTP(w1, req1)

	var body1 map[string]string
	if err := json.Unmarshal(w1.Body.Bytes(), &body1); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if body1["error"] != "something failed" || body1["request_id"] != "req-fixed-123" {
		t.Fatalf("unexpected body1: %v", body1)
	}

	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodGet, "/error-existing", nil)
	req2.Header.Set(RequestIDHeader, "req-fixed-456")
	r.ServeHTTP(w2, req2)

	var body2 map[string]string
	if err := json.Unmarshal(w2.Body.Bytes(), &body2); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if body2["error"] != "forbidden" || body2["request_id"] != "custom-id" {
		t.Fatalf("unexpected body2: %v", body2)
	}
}
