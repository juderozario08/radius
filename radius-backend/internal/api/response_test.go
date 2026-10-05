package api

import (
	"encoding/json"
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
