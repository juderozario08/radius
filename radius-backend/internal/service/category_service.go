// radius-backend/internal/service/category_service.go
package service

import (
	"context"
	"encoding/json"
	"log"
	"radius/internal/models"
	"time"

	"github.com/redis/go-redis/v9"
)

type CategoryService struct {
	categoryRepo CategoryRepository
	redisClient  *redis.Client
}

func NewCategoryService(categoryRepo CategoryRepository, redisClient *redis.Client) *CategoryService {
	return &CategoryService{
		categoryRepo: categoryRepo,
		redisClient:  redisClient,
	}
}

func (s *CategoryService) GetAllCategories(ctx context.Context) ([]models.Category, error) {
	cacheKey := "categories:all"
	val, err := s.redisClient.Get(ctx, cacheKey).Result()
	if err == nil {
		var categories []models.Category
		if err := json.Unmarshal([]byte(val), &categories); err == nil {
			return categories, nil
		}
	}

	categories, err := s.categoryRepo.GetAllCategories(ctx)
	if err != nil {
		return nil, err
	}

	if categories != nil {
		catJSON, err := json.Marshal(categories)
		if err == nil {
			s.redisClient.Set(ctx, cacheKey, catJSON, 1*time.Hour)
		} else {
			log.Printf("Failed to marshal categories for cache: %v", err)
		}
	}

	return categories, nil
}

func (s *CategoryService) GetDistinctBrands(ctx context.Context) ([]string, error) {
	cacheKey := "brands:distinct"
	val, err := s.redisClient.Get(ctx, cacheKey).Result()
	if err == nil {
		var brands []string
		if err := json.Unmarshal([]byte(val), &brands); err == nil {
			return brands, nil
		}
	}

	brands, err := s.categoryRepo.GetDistinctBrands(ctx)
	if err != nil {
		return nil, err
	}

	if brands != nil {
		brandsJSON, err := json.Marshal(brands)
		if err == nil {
			s.redisClient.Set(ctx, cacheKey, brandsJSON, 1*time.Hour)
		} else {
			log.Printf("Failed to marshal brands for cache: %v", err)
		}
	}

	return brands, nil
}
