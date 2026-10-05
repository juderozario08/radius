package utils_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"radius/internal/utils"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestGenerateETag(t *testing.T) {
	payload1, _ := json.Marshal(map[string]string{"name": "Hardware", "id": "1"})
	payload2, _ := json.Marshal(map[string]string{"name": "Hardware", "id": "1"})
	payload3, _ := json.Marshal(map[string]string{"name": "Tools", "id": "2"})

	etag1 := utils.GenerateETag(payload1)
	etag2 := utils.GenerateETag(payload2)
	etag3 := utils.GenerateETag(payload3)

	if etag1 != etag2 {
		t.Fatalf("expected identical etags for identical payloads, got %s and %s", etag1, etag2)
	}
	if etag1 == etag3 {
		t.Fatalf("expected different etags for different payloads, got %s", etag1)
	}
}

func TestRenderJSONWithETag_Returns200WithHeaders(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/categories", nil)

	data := map[string]any{"categories": []string{"Tools", "Paint"}}
	utils.RenderJSONWithETag(c, http.StatusOK, data, "public, max-age=60, stale-while-revalidate=300")

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if w.Header().Get("ETag") == "" {
		t.Fatalf("expected non-empty ETag header")
	}
	if w.Header().Get("Cache-Control") != "public, max-age=60, stale-while-revalidate=300" {
		t.Fatalf("unexpected Cache-Control header: %s", w.Header().Get("Cache-Control"))
	}
	if w.Header().Get("Vary") != "Accept-Encoding" {
		t.Fatalf("unexpected Vary header: %s", w.Header().Get("Vary"))
	}
}

func TestRenderJSONWithETag_Returns304WhenMatching(t *testing.T) {
	data := map[string]any{"categories": []string{"Tools", "Paint"}}
	serialized, _ := json.Marshal(data)
	expectedETag := utils.GenerateETag(serialized)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/categories", nil)
	req.Header.Set("If-None-Match", expectedETag)
	c.Request = req

	utils.RenderJSONWithETag(c, http.StatusOK, data, "public, max-age=60, stale-while-revalidate=300")

	if w.Code != http.StatusNotModified {
		t.Fatalf("expected status 304, got %d", w.Code)
	}
	if w.Body.Len() != 0 {
		t.Fatalf("expected empty body on 304, got %d bytes", w.Body.Len())
	}
	if w.Header().Get("ETag") != expectedETag {
		t.Fatalf("expected matching ETag header %s, got %s", expectedETag, w.Header().Get("ETag"))
	}
}

func TestRenderJSONWithETag_Returns200WhenETagDiffers(t *testing.T) {
	data := map[string]any{"categories": []string{"Tools", "Paint"}}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/categories", nil)
	req.Header.Set("If-None-Match", `"w/outdated-etag"`)
	c.Request = req

	utils.RenderJSONWithETag(c, http.StatusOK, data, "public, max-age=60, stale-while-revalidate=300")

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if w.Body.Len() == 0 {
		t.Fatalf("expected non-empty body on 200")
	}
}
