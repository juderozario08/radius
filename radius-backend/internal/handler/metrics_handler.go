package handler

import (
	"database/sql"
	"fmt"
	"net/http"
	"radius/internal/database"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type MetricsHandler struct {
	db          *sql.DB
	redisClient *redis.Client
}

func NewMetricsHandler(db *sql.DB, redisClient *redis.Client) *MetricsHandler {
	return &MetricsHandler{
		db:          db,
		redisClient: redisClient,
	}
}

func (h *MetricsHandler) GetMetrics(c *gin.Context) {
	ctx := c.Request.Context()
	healthy, msg, pingDuration := database.CheckRedisHealth(ctx, h.redisClient)

	var pgStats *database.PostgresPoolStats
	if h.db != nil {
		stats := h.db.Stats()
		pgStats = &database.PostgresPoolStats{
			MaxOpenConnections: stats.MaxOpenConnections,
			OpenConnections:    stats.OpenConnections,
			InUse:              stats.InUse,
			Idle:               stats.Idle,
			WaitCount:          stats.WaitCount,
			WaitDurationMs:     stats.WaitDuration.Milliseconds(),
			MaxIdleClosed:      stats.MaxIdleClosed,
			MaxIdleTimeClosed:  stats.MaxIdleTimeClosed,
			MaxLifetimeClosed:  stats.MaxLifetimeClosed,
		}
	}

	snapshot := database.CacheMetrics.Snapshot()
	hitCount := snapshot["hits"]
	missCount := snapshot["misses"]
	var hitRatio float64
	if total := hitCount + missCount; total > 0 {
		hitRatio = float64(hitCount) / float64(total)
	}

	format := c.Query("format")
	acceptHeader := c.GetHeader("Accept")
	if format == "prometheus" || strings.Contains(acceptHeader, "text/plain") {
		var b strings.Builder
		fmt.Fprintf(&b, "# HELP radius_cache_hits_total Total cache hits\n# TYPE radius_cache_hits_total counter\nradius_cache_hits_total %d\n", hitCount)
		fmt.Fprintf(&b, "# HELP radius_cache_misses_total Total cache misses\n# TYPE radius_cache_misses_total counter\nradius_cache_misses_total %d\n", missCount)
		fmt.Fprintf(&b, "# HELP radius_cache_negative_hits_total Total negative cache hits\n# TYPE radius_cache_negative_hits_total counter\nradius_cache_negative_hits_total %d\n", snapshot["negative_hits"])
		fmt.Fprintf(&b, "# HELP radius_cache_fallback_reads_total Total fallback reads from PostgreSQL\n# TYPE radius_cache_fallback_reads_total counter\nradius_cache_fallback_reads_total %d\n", snapshot["fallback_reads"])
		fmt.Fprintf(&b, "# HELP radius_cache_set_errors_total Total Redis set errors\n# TYPE radius_cache_set_errors_total counter\nradius_cache_set_errors_total %d\n", snapshot["set_errors"])
		fmt.Fprintf(&b, "# HELP radius_cache_delete_errors_total Total Redis delete errors\n# TYPE radius_cache_delete_errors_total counter\nradius_cache_delete_errors_total %d\n", snapshot["delete_errors"])
		fmt.Fprintf(&b, "# HELP radius_cache_serialization_failures_total Total serialization failures\n# TYPE radius_cache_serialization_failures_total counter\nradius_cache_serialization_failures_total %d\n", snapshot["serialization_failures"])
		fmt.Fprintf(&b, "# HELP radius_cache_pool_wait_timeouts_total Total pool wait timeouts\n# TYPE radius_cache_pool_wait_timeouts_total counter\nradius_cache_pool_wait_timeouts_total %d\n", snapshot["pool_wait_timeouts"])
		fmt.Fprintf(&b, "# HELP radius_cache_hit_ratio Cache hit ratio\n# TYPE radius_cache_hit_ratio gauge\nradius_cache_hit_ratio %.4f\n", hitRatio)
		fmt.Fprintf(&b, "# HELP radius_redis_ping_latency_ms Last Redis ping latency in ms\n# TYPE radius_redis_ping_latency_ms gauge\nradius_redis_ping_latency_ms %d\n", pingDuration.Milliseconds())
		fmt.Fprintf(&b, "# HELP radius_redis_command_count_total Total Redis commands processed\n# TYPE radius_redis_command_count_total counter\nradius_redis_command_count_total %d\n", snapshot["command_count"])
		fmt.Fprintf(&b, "# HELP radius_redis_avg_command_latency_ms Average Redis command latency in ms\n# TYPE radius_redis_avg_command_latency_ms gauge\nradius_redis_avg_command_latency_ms %.4f\n", database.CacheMetrics.AvgCommandLatencyMs())

		if pgStats != nil {
			fmt.Fprintf(&b, "# HELP radius_db_pool_open_connections Current open db connections\n# TYPE radius_db_pool_open_connections gauge\nradius_db_pool_open_connections %d\n", pgStats.OpenConnections)
			fmt.Fprintf(&b, "# HELP radius_db_pool_in_use_connections Current in-use db connections\n# TYPE radius_db_pool_in_use_connections gauge\nradius_db_pool_in_use_connections %d\n", pgStats.InUse)
			fmt.Fprintf(&b, "# HELP radius_db_pool_idle_connections Current idle db connections\n# TYPE radius_db_pool_idle_connections gauge\nradius_db_pool_idle_connections %d\n", pgStats.Idle)
			fmt.Fprintf(&b, "# HELP radius_db_pool_wait_count_total Total connection wait count\n# TYPE radius_db_pool_wait_count_total counter\nradius_db_pool_wait_count_total %d\n", pgStats.WaitCount)
			fmt.Fprintf(&b, "# HELP radius_db_pool_wait_duration_ms Total connection wait duration in ms\n# TYPE radius_db_pool_wait_duration_ms counter\nradius_db_pool_wait_duration_ms %d\n", pgStats.WaitDurationMs)
		}

		c.Data(http.StatusOK, "text/plain; version=0.0.4; charset=utf-8", []byte(b.String()))
		return
	}

	response := gin.H{
		"redis": gin.H{
			"healthy":                healthy,
			"message":                msg,
			"ping_latency_ms":        pingDuration.Milliseconds(),
			"avg_command_latency_ms": database.CacheMetrics.AvgCommandLatencyMs(),
			"hit_ratio":              hitRatio,
			"metrics":                snapshot,
		},
		"database_pool": pgStats,
	}

	c.JSON(http.StatusOK, response)
}
