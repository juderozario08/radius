package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"radius/internal/database"
	"radius/internal/handler"
	"strings"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func TestMetricsHandler_GetMetricsJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	s, err := miniredis.Run()
	if err != nil {
		t.Fatalf("Failed to run miniredis: %v", err)
	}
	defer s.Close()

	rdb := redis.NewClient(&redis.Options{Addr: s.Addr()})
	defer rdb.Close()

	database.CacheMetrics.RecordHit()
	database.CacheMetrics.RecordMiss()

	h := handler.NewMetricsHandler(nil, rdb)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/api/v1/metrics", nil)

	h.GetMetrics(c)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var res map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}

	redisSection, ok := res["redis"].(map[string]any)
	if !ok {
		t.Fatalf("Expected redis key in response")
	}

	if redisSection["healthy"] != true {
		t.Errorf("Expected redis to be healthy")
	}
}

func TestMetricsHandler_GetMetricsPrometheus(t *testing.T) {
	gin.SetMode(gin.TestMode)

	s, err := miniredis.Run()
	if err != nil {
		t.Fatalf("Failed to run miniredis: %v", err)
	}
	defer s.Close()

	rdb := redis.NewClient(&redis.Options{Addr: s.Addr()})
	defer rdb.Close()

	h := handler.NewMetricsHandler(nil, rdb)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/api/v1/metrics?format=prometheus", nil)

	h.GetMetrics(c)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "radius_cache_hits_total") {
		t.Errorf("Expected radius_cache_hits_total in Prometheus output")
	}
	if !strings.Contains(body, "radius_redis_ping_latency_ms") {
		t.Errorf("Expected radius_redis_ping_latency_ms in Prometheus output")
	}
}
