package database

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
)

type MetricsCollector struct {
	Hits                  atomic.Int64
	Misses                atomic.Int64
	NegativeHits          atomic.Int64
	FallbackReads         atomic.Int64
	SetErrors             atomic.Int64
	DeleteErrors          atomic.Int64
	SerializationFailures atomic.Int64
	PoolWaitTimeouts      atomic.Int64
	LastPingLatencyMs     atomic.Int64
	CommandCount          atomic.Int64
	CommandDurationUs     atomic.Int64
}

var CacheMetrics = &MetricsCollector{}

func (m *MetricsCollector) RecordHit() {
	m.Hits.Add(1)
}

func (m *MetricsCollector) RecordMiss() {
	m.Misses.Add(1)
}

func (m *MetricsCollector) RecordNegativeHit() {
	m.NegativeHits.Add(1)
}

func (m *MetricsCollector) RecordFallback() {
	m.FallbackReads.Add(1)
}

func (m *MetricsCollector) RecordSetError() {
	m.SetErrors.Add(1)
}

func (m *MetricsCollector) RecordDeleteError() {
	m.DeleteErrors.Add(1)
}

func (m *MetricsCollector) RecordSerializationFailure() {
	m.SerializationFailures.Add(1)
}

func (m *MetricsCollector) RecordPoolTimeout() {
	m.PoolWaitTimeouts.Add(1)
}

func (m *MetricsCollector) RecordPingLatency(d time.Duration) {
	m.LastPingLatencyMs.Store(d.Milliseconds())
}

func (m *MetricsCollector) RecordCommandDuration(d time.Duration) {
	m.CommandCount.Add(1)
	m.CommandDurationUs.Add(d.Microseconds())
}

func (m *MetricsCollector) AvgCommandLatencyMs() float64 {
	count := m.CommandCount.Load()
	if count == 0 {
		return 0
	}
	return float64(m.CommandDurationUs.Load()) / float64(count) / 1000.0
}

type PostgresPoolStats struct {
	MaxOpenConnections int   `json:"max_open_connections"`
	OpenConnections    int   `json:"open_connections"`
	InUse              int   `json:"in_use"`
	Idle               int   `json:"idle"`
	WaitCount          int64 `json:"wait_count"`
	WaitDurationMs     int64 `json:"wait_duration_ms"`
	MaxIdleClosed      int64 `json:"max_idle_closed"`
	MaxIdleTimeClosed  int64 `json:"max_idle_time_closed"`
	MaxLifetimeClosed  int64 `json:"max_lifetime_closed"`
}

func (m *MetricsCollector) Snapshot() map[string]int64 {
	return map[string]int64{
		"hits":                   m.Hits.Load(),
		"misses":                 m.Misses.Load(),
		"negative_hits":          m.NegativeHits.Load(),
		"fallback_reads":         m.FallbackReads.Load(),
		"set_errors":             m.SetErrors.Load(),
		"delete_errors":          m.DeleteErrors.Load(),
		"serialization_failures": m.SerializationFailures.Load(),
		"pool_wait_timeouts":     m.PoolWaitTimeouts.Load(),
		"last_ping_latency_ms":   m.LastPingLatencyMs.Load(),
		"command_count":          m.CommandCount.Load(),
		"command_duration_us":    m.CommandDurationUs.Load(),
	}
}

func CheckRedisHealth(ctx context.Context, client *redis.Client) (bool, string, time.Duration) {
	if client == nil {
		return false, "redis client is nil", 0
	}
	start := time.Now()
	pingCtx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()

	_, err := client.Ping(pingCtx).Result()
	duration := time.Since(start)
	CacheMetrics.RecordPingLatency(duration)

	if err != nil {
		return false, fmt.Sprintf("ping failed: %v", err), duration
	}
	return true, "healthy", duration
}
