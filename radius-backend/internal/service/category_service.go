package service

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"radius/internal/cache"
	"radius/internal/database"
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

func (s *CategoryService) InvalidateCategoriesCache(ctx context.Context) {
	if s.redisClient == nil {
		return
	}
	newKey := cache.CatalogCategoriesKey()
	if err := s.redisClient.Del(ctx, newKey).Err(); err != nil && !errors.Is(err, redis.Nil) {
		database.CacheMetrics.RecordDeleteError()
		slog.WarnContext(ctx, "failed to invalidate categories cache", "error", err)
	}
}

func (s *CategoryService) InvalidateBrandsCache(ctx context.Context) {
	if s.redisClient == nil {
		return
	}
	newKey := cache.CatalogBrandsKey()
	if err := s.redisClient.Del(ctx, newKey).Err(); err != nil && !errors.Is(err, redis.Nil) {
		database.CacheMetrics.RecordDeleteError()
		slog.WarnContext(ctx, "failed to invalidate brands cache", "error", err)
	}
}

func (s *CategoryService) GetAllCategories(ctx context.Context) ([]models.Category, error) {
	newKey := cache.CatalogCategoriesKey()

	if s.redisClient != nil {
		val, err := s.redisClient.Get(ctx, newKey).Result()
		if err == nil {
			var categories []models.Category
			if jsonErr := json.Unmarshal([]byte(val), &categories); jsonErr == nil {
				database.CacheMetrics.RecordHit()
				return categories, nil
			}
			database.CacheMetrics.RecordSerializationFailure()
			_ = s.redisClient.Del(ctx, newKey).Err()
		} else if !errors.Is(err, redis.Nil) {
			database.CacheMetrics.RecordFallback()
			slog.WarnContext(ctx, "redis get failed", "key", newKey, "error", err)
		}
	}

	database.CacheMetrics.RecordMiss()

	val, err, _ := s.sfGroup.Do(newKey, func() (any, error) {
		categories, err := s.categoryRepo.GetAllCategories(ctx)
		if err != nil {
			return nil, err
		}

		if s.redisClient != nil && categories != nil {
			catJSON, err := json.Marshal(categories)
			if err == nil {
				ttl := cache.ApplyJitter(1*time.Hour, 5*time.Minute)
				if setErr := s.redisClient.Set(ctx, newKey, catJSON, ttl).Err(); setErr != nil {
					database.CacheMetrics.RecordSetError()
					slog.WarnContext(ctx, "redis set failed", "key", newKey, "error", setErr)
				}
			} else {
				database.CacheMetrics.RecordSerializationFailure()
				slog.ErrorContext(ctx, "failed to marshal categories for cache", "error", err)
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
	newKey := cache.CatalogBrandsKey()

	if s.redisClient != nil {
		val, err := s.redisClient.Get(ctx, newKey).Result()
		if err == nil {
			var brands []string
			if jsonErr := json.Unmarshal([]byte(val), &brands); jsonErr == nil {
				database.CacheMetrics.RecordHit()
				return brands, nil
			}
			database.CacheMetrics.RecordSerializationFailure()
			_ = s.redisClient.Del(ctx, newKey).Err()
		} else if !errors.Is(err, redis.Nil) {
			database.CacheMetrics.RecordFallback()
			slog.WarnContext(ctx, "redis get failed", "key", newKey, "error", err)
		}
	}

	database.CacheMetrics.RecordMiss()

	val, err, _ := s.sfGroup.Do(newKey, func() (any, error) {
		brands, err := s.categoryRepo.GetDistinctBrands(ctx)
		if err != nil {
			return nil, err
		}

		if s.redisClient != nil && brands != nil {
			brandsJSON, err := json.Marshal(brands)
			if err == nil {
				ttl := cache.ApplyJitter(1*time.Hour, 5*time.Minute)
				if setErr := s.redisClient.Set(ctx, newKey, brandsJSON, ttl).Err(); setErr != nil {
					database.CacheMetrics.RecordSetError()
					slog.WarnContext(ctx, "redis set failed", "key", newKey, "error", setErr)
				}
			} else {
				database.CacheMetrics.RecordSerializationFailure()
				slog.ErrorContext(ctx, "failed to marshal brands for cache", "error", err)
			}
		}

		return brands, nil
	})
	if err != nil {
		return nil, err
	}

	return val.([]string), nil
}

func (s *CategoryService) CreateCategory(ctx context.Context, name string, parentID *int) (*models.Category, error) {
	c, err := s.categoryRepo.CreateCategory(ctx, name, parentID)
	if err != nil {
		return nil, err
	}
	s.InvalidateCategoriesCache(ctx)
	return c, nil
}

func (s *CategoryService) UpdateCategory(ctx context.Context, id int, name string, parentID *int) error {
	err := s.categoryRepo.UpdateCategory(ctx, id, name, parentID)
	if err != nil {
		return err
	}
	s.InvalidateCategoriesCache(ctx)
	return nil
}

func (s *CategoryService) DeleteCategory(ctx context.Context, id int) error {
	err := s.categoryRepo.DeleteCategory(ctx, id)
	if err != nil {
		return err
	}
	s.InvalidateCategoriesCache(ctx)
	return nil
}
