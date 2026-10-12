package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestResponseHelpers(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	Success(c, http.StatusOK, map[string]string{"foo": "bar"})
	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var data map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &data); err != nil || data["foo"] != "bar" {
		t.Fatalf("unexpected body: %s", w.Body.String())
	}
}

func TestErrorMessageHelpers(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	Error(c, http.StatusBadRequest, "bad input")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil || errResp["error"] != "bad input" {
		t.Fatalf("unexpected body: %s", w.Body.String())
	}

	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	Message(c2, http.StatusOK, "action completed")
	if w2.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w2.Code)
	}

	var msgResp map[string]string
	if err := json.Unmarshal(w2.Body.Bytes(), &msgResp); err != nil || msgResp["message"] != "action completed" {
		t.Fatalf("unexpected body: %s", w2.Body.String())
	}
}

func TestErrorWithRequestID(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	c.Request = req
	c.Set("request_id", "req-xyz-123")

	Error(c, http.StatusBadRequest, "invalid request")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if resp["error"] != "invalid request" || resp["request_id"] != "req-xyz-123" {
		t.Fatalf("unexpected response: %v", resp)
	}

	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req
	c2.Set("request_id", "req-xyz-123")
	ErrorWithDetails(c2, http.StatusBadRequest, "failed", "more details")
	var detailsResp map[string]string
	if err := json.Unmarshal(w2.Body.Bytes(), &detailsResp); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if detailsResp["error"] != "failed" || detailsResp["details"] != "more details" || detailsResp["request_id"] != "req-xyz-123" {
		t.Fatalf("unexpected details response: %v", detailsResp)
	}
}

func TestHandleError(t *testing.T) {
	tests := []struct {
		err         error
		fallback    string
		wantStatus  int
		wantMessage string
	}{
		{err: ErrForbidden, fallback: "fb", wantStatus: http.StatusForbidden, wantMessage: "You are not authorized to perform this action"},
		{err: ErrNotFound, fallback: "fb", wantStatus: http.StatusNotFound, wantMessage: "Resource not found"},
		{err: ErrConflict, fallback: "item conflict", wantStatus: http.StatusConflict, wantMessage: "item conflict"},
		{err: ErrValidation, fallback: "validation failed", wantStatus: http.StatusBadRequest, wantMessage: "validation failed"},
		{err: errors.New("boom"), fallback: "fallback error", wantStatus: http.StatusInternalServerError, wantMessage: "An internal error occurred"},
	}

	for _, tt := range tests {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		c.Request = req
		c.Set("request_id", "req-test-999")

		HandleError(c, tt.err, tt.fallback)
		if w.Code != tt.wantStatus {
			t.Fatalf("got status %d, want %d", w.Code, tt.wantStatus)
		}

		var resp map[string]string
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("invalid json: %v", err)
		}
		if resp["error"] != tt.wantMessage || resp["request_id"] != "req-test-999" {
			t.Fatalf("unexpected resp: %v", resp)
		}
	}
}
