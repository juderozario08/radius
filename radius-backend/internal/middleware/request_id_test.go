package middleware

import (
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
