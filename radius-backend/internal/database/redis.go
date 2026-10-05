package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func getEnvInt(key string, defaultVal int) int {
	valStr := os.Getenv(key)
	if valStr == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(valStr)
	if err != nil {
		return defaultVal
	}
	return val
}

func getEnvDuration(key string, defaultVal time.Duration) time.Duration {
	valStr := os.Getenv(key)
	if valStr == "" {
		return defaultVal
	}
	val, err := time.ParseDuration(valStr)
	if err != nil {
		return defaultVal
	}
	return val
}

func configureRedisOptions(opts *redis.Options) {
	opts.PoolSize = getEnvInt("REDIS_POOL_SIZE", 100)
	opts.MinIdleConns = getEnvInt("REDIS_MIN_IDLE_CONNS", 10)
	opts.ConnMaxLifetime = getEnvDuration("REDIS_CONN_MAX_LIFETIME", 30*time.Minute)
	opts.ConnMaxIdleTime = getEnvDuration("REDIS_CONN_MAX_IDLE_TIME", 5*time.Minute)
	opts.DialTimeout = getEnvDuration("REDIS_DIAL_TIMEOUT", 3*time.Second)
	opts.ReadTimeout = getEnvDuration("REDIS_READ_TIMEOUT", 2*time.Second)
	opts.WriteTimeout = getEnvDuration("REDIS_WRITE_TIMEOUT", 2*time.Second)
	opts.PoolTimeout = getEnvDuration("REDIS_POOL_TIMEOUT", 4*time.Second)
}

func ConnectRedis(redisURL string) (*redis.Client, error) {
	if redisURL == "" {
		return nil, fmt.Errorf("REDIS_URL environment variable not set")
	}

	if redisURL == "local" {
		log.Println("Starting embedded Redis (miniredis) for local development...")
		s, err := miniredis.Run()
		if err != nil {
			return nil, fmt.Errorf("failed to start embedded redis: %w", err)
		}

		opts := &redis.Options{
			Addr: s.Addr(),
		}
		configureRedisOptions(opts)
		client := redis.NewClient(opts)
		client.AddHook(redisMetricsHook{})

		log.Println("Successfully connected to embedded Redis")
		return client, nil
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	configureRedisOptions(opts)
	client := redis.NewClient(opts)
	client.AddHook(redisMetricsHook{})

	_, err = client.Ping(context.Background()).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("Successfully connected to Redis")
	return client, nil
}

type redisMetricsHook struct{}

func (h redisMetricsHook) DialHook(next redis.DialHook) redis.DialHook {
	return next
}

func (h redisMetricsHook) ProcessHook(next redis.ProcessHook) redis.ProcessHook {
	return func(ctx context.Context, cmd redis.Cmder) error {
		start := time.Now()
		err := next(ctx, cmd)
		CacheMetrics.RecordCommandDuration(time.Since(start))
		return err
	}
}

func (h redisMetricsHook) ProcessPipelineHook(next redis.ProcessPipelineHook) redis.ProcessPipelineHook {
	return func(ctx context.Context, cmds []redis.Cmder) error {
		start := time.Now()
		err := next(ctx, cmds)
		CacheMetrics.RecordCommandDuration(time.Since(start))
		return err
	}
}
