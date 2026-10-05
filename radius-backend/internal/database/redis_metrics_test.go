package database_test

import (
	"context"
	"radius/internal/database"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestMetricsCollector_Operations(t *testing.T) {
	c := &database.MetricsCollector{}

	c.RecordHit()
	c.RecordHit()
	c.RecordMiss()
	c.RecordNegativeHit()
	c.RecordFallback()
	c.RecordSetError()
	c.RecordDeleteError()
	c.RecordSerializationFailure()
	c.RecordPoolTimeout()
	c.RecordPingLatency(15 * time.Millisecond)

	snap := c.Snapshot()

	if snap["hits"] != 2 {
		t.Fatalf("expected 2 hits, got %d", snap["hits"])
	}
	if snap["misses"] != 1 {
		t.Fatalf("expected 1 miss, got %d", snap["misses"])
	}
	if snap["negative_hits"] != 1 {
		t.Fatalf("expected 1 negative hit, got %d", snap["negative_hits"])
	}
	if snap["fallback_reads"] != 1 {
		t.Fatalf("expected 1 fallback read, got %d", snap["fallback_reads"])
	}
	if snap["set_errors"] != 1 {
		t.Fatalf("expected 1 set_error, got %d", snap["set_errors"])
	}
	if snap["delete_errors"] != 1 {
		t.Fatalf("expected 1 delete_error, got %d", snap["delete_errors"])
	}
	if snap["serialization_failures"] != 1 {
		t.Fatalf("expected 1 serialization failure, got %d", snap["serialization_failures"])
	}
	if snap["pool_wait_timeouts"] != 1 {
		t.Fatalf("expected 1 pool timeout, got %d", snap["pool_wait_timeouts"])
	}
	if snap["last_ping_latency_ms"] != 15 {
		t.Fatalf("expected 15ms latency, got %d", snap["last_ping_latency_ms"])
	}
}

func TestCheckRedisHealth(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	healthy, msg, dur := database.CheckRedisHealth(context.Background(), rdb)
	if !healthy {
		t.Fatalf("expected healthy status, got message: %s", msg)
	}
	if dur < 0 {
		t.Fatalf("expected non-negative duration, got %v", dur)
	}

	mr.Close()
	healthyDown, msgDown, _ := database.CheckRedisHealth(context.Background(), rdb)
	if healthyDown {
		t.Fatalf("expected unhealthy status when redis is closed, got: %s", msgDown)
	}
}

func TestCheckRedisHealth_NilClient(t *testing.T) {
	healthy, msg, _ := database.CheckRedisHealth(context.Background(), nil)
	if healthy {
		t.Fatalf("expected unhealthy status for nil client, got: %s", msg)
	}
}
