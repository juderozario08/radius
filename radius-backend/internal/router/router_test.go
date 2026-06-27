package router_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"radius/internal/router"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHealthRouter(t *testing.T) {
	cfg := router.Config{}
	r := router.NewRouter(cfg)

	req, _ := http.NewRequest(http.MethodGet, "/health", nil)

	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]any
	err := json.Unmarshal(w.Body.Bytes(), &response)

	assert.NoError(t, err)
	assert.Equal(t, "Server is working!", response["message"])
}
