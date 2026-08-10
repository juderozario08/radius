package database

import (
	"context"
	"fmt"
	"log"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

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
		
		client := redis.NewClient(&redis.Options{
			Addr: s.Addr(),
		})
		
		// We shouldn't close the miniredis server here because it needs to run as long as the app runs.
		// It will naturally die when the Go process exits.
		log.Println("Successfully connected to embedded Redis")
		return client, nil
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	client := redis.NewClient(opts)

	// Ping the Redis server to check connection
	_, err = client.Ping(context.Background()).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("Successfully connected to Redis")
	return client, nil
}
