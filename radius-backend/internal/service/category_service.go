package service

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"math/rand/v2"
	"radius/internal/models"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

type CategoryService struct {
	categoryRepo CategoryRepository
	redisClient  *redis.Client
	sfGroup      singleflight.Group
}

func NewCategoryService(categoryRepo CategoryRepository, redisClient *redis.Client) *CategoryService {
	return &CategoryService{
		categoryRepo: categoryRepo,
		redisClient:  redisClient,
	}
}

func (s *CategoryService) GetAllCategories(ctx context.Context) ([]models.Category, error) {
	cacheKey := "categories:all"
	if s.redisClient != nil {
		val, err := s.redisClient.Get(ctx, cacheKey).Result()
		if err == nil {
			var categories []models.Category
			if err := json.Unmarshal([]byte(val), &categories); err == nil {
				return categories, nil
			}
		} else if !errors.Is(err, redis.Nil) {
			log.Printf("[WARN] Redis get failed for %s: %v", cacheKey, err)
		}
	}

	val, err, _ := s.sfGroup.Do(cacheKey, func() (any, error) {
		categories, err := s.categoryRepo.GetAllCategories(ctx)
		if err != nil {
			return nil, err
		}

		if s.redisClient != nil && categories != nil {
			catJSON, err := json.Marshal(categories)
			if err == nil {
				ttl := 1*time.Hour + time.Duration(rand.IntN(300))*time.Second
				if setErr := s.redisClient.Set(ctx, cacheKey, catJSON, ttl).Err(); setErr != nil {
					log.Printf("[WARN] Redis set failed for %s: %v", cacheKey, setErr)
				}
			} else {
				log.Printf("Failed to marshal categories for cache: %v", err)
			}
		}

		return categories, nil
	})
	if err != nil {
		return nil, err
	}

	return val.([]models.Category), nil
}

func (s *CategoryService) GetDistinctBrands(ctx context.Context) ([]string, error) {
	cacheKey := "brands:distinct"
	if s.redisClient != nil {
		val, err := s.redisClient.Get(ctx, cacheKey).Result()
		if err == nil {
			var brands []string
			if err := json.Unmarshal([]byte(val), &brands); err == nil {
				return brands, nil
			}
		} else if !errors.Is(err, redis.Nil) {
			log.Printf("[WARN] Redis get failed for %s: %v", cacheKey, err)
		}
	}

	val, err, _ := s.sfGroup.Do(cacheKey, func() (any, error) {
		brands, err := s.categoryRepo.GetDistinctBrands(ctx)
		if err != nil {
			return nil, err
		}

		if s.redisClient != nil && brands != nil {
			brandsJSON, err := json.Marshal(brands)
			if err == nil {
				ttl := 1*time.Hour + time.Duration(rand.IntN(300))*time.Second
				if setErr := s.redisClient.Set(ctx, cacheKey, brandsJSON, ttl).Err(); setErr != nil {
					log.Printf("[WARN] Redis set failed for %s: %v", cacheKey, setErr)
				}
			} else {
				log.Printf("Failed to marshal brands for cache: %v", err)
			}
		}

		return brands, nil
	})
	if err != nil {
		return nil, err
	}

	return val.([]string), nil
}
