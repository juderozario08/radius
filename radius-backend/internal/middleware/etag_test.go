package middleware

import (
	"crypto/sha1"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestETagMiddleware_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(ETagMiddleware())

	responsePayload := `{"categories":[{"id":1,"name":"Electronics"}]}`
	r.GET("/test-etag", func(c *gin.Context) {
		c.String(http.StatusOK, responsePayload)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/test-etag", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	etag := w.Header().Get("ETag")
	if etag == "" {
		t.Fatal("expected ETag header, got empty")
	}

	h := sha1.Sum([]byte(responsePayload))
	expectedETag := `"` + hex.EncodeToString(h[:]) + `"`
	if etag != expectedETag {
		t.Fatalf("expected ETag %s, got %s", expectedETag, etag)
	}

	wMatch := httptest.NewRecorder()
	reqMatch, _ := http.NewRequest(http.MethodGet, "/test-etag", nil)
	reqMatch.Header.Set("If-None-Match", etag)
	r.ServeHTTP(wMatch, reqMatch)

	if wMatch.Code != http.StatusNotModified {
		t.Fatalf("expected status 304 Not Modified, got %d", wMatch.Code)
	}
	if wMatch.Body.Len() != 0 {
		t.Fatalf("expected empty body for 304, got %s", wMatch.Body.String())
	}

	wWeak := httptest.NewRecorder()
	reqWeak, _ := http.NewRequest(http.MethodGet, "/test-etag", nil)
	reqWeak.Header.Set("If-None-Match", "W/"+etag)
	r.ServeHTTP(wWeak, reqWeak)

	if wWeak.Code != http.StatusNotModified {
		t.Fatalf("expected status 304 for weak match, got %d", wWeak.Code)
	}

	wMismatch := httptest.NewRecorder()
	reqMismatch, _ := http.NewRequest(http.MethodGet, "/test-etag", nil)
	reqMismatch.Header.Set("If-None-Match", `"different-etag"`)
	r.ServeHTTP(wMismatch, reqMismatch)

	if wMismatch.Code != http.StatusOK {
		t.Fatalf("expected status 200 for mismatched ETag, got %d", wMismatch.Code)
	}
	if wMismatch.Body.String() != responsePayload {
		t.Fatalf("expected body %s, got %s", responsePayload, wMismatch.Body.String())
	}
}

func TestETagMiddleware_NonGetIgnored(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(ETagMiddleware())

	r.POST("/test-post", func(c *gin.Context) {
		c.String(http.StatusOK, `{"status":"created"}`)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/test-post", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if w.Header().Get("ETag") != "" {
		t.Fatal("expected no ETag on POST request")
	}
}

func TestETagMiddleware_WebsocketIgnored(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(ETagMiddleware())

	r.GET("/ws", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/ws", nil)
	req.Header.Set("Upgrade", "websocket")
	req.Header.Set("Connection", "Upgrade")
	r.ServeHTTP(w, req)

	if w.Header().Get("ETag") != "" {
		t.Fatal("expected no ETag for websocket upgrade")
	}
}

func TestETagMiddleware_PreservesUnwrittenStatus(t *testing.T) {
	tests := []struct {
		name        string
		noRoute     gin.HandlerFunc
		target      string
		ifNoneMatch string
		wantStatus  int
		wantBody    string
		wantLogged  int
	}{
		{name: "unknown route keeps gin default 404", target: "/missing", wantStatus: http.StatusNotFound, wantBody: "404 page not found", wantLogged: http.StatusNotFound},
		{name: "unknown route with NoRoute handler", noRoute: func(c *gin.Context) { c.JSON(http.StatusNotFound, gin.H{"error": "Route not found"}) }, target: "/missing", wantStatus: http.StatusNotFound, wantBody: `{"error":"Route not found"}`, wantLogged: http.StatusNotFound},
		{name: "known route returns 200", target: "/known", wantStatus: http.StatusOK, wantBody: "ok", wantLogged: http.StatusOK},
		{name: "known route revalidated returns 304", target: "/known", ifNoneMatch: "*", wantStatus: http.StatusNotModified, wantLogged: http.StatusNotModified},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			r := gin.New()
			var logged int
			r.Use(func(c *gin.Context) {
				c.Next()
				logged = c.Writer.Status()
			}, ETagMiddleware())
			r.GET("/known", func(c *gin.Context) { c.String(http.StatusOK, "ok") })
			if tt.noRoute != nil {
				r.NoRoute(tt.noRoute)
			}

			w := httptest.NewRecorder()
			req, _ := http.NewRequest(http.MethodGet, tt.target, nil)
			if tt.ifNoneMatch != "" {
				req.Header.Set("If-None-Match", tt.ifNoneMatch)
			}
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", w.Code, tt.wantStatus)
			}
			if w.Body.String() != tt.wantBody {
				t.Fatalf("body = %q, want %q", w.Body.String(), tt.wantBody)
			}
			if logged != tt.wantLogged {
				t.Fatalf("outer middleware saw status %d, want %d", logged, tt.wantLogged)
			}
		})
	}
}
