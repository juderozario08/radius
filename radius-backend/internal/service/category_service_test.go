package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/mock/gomock"
)

func setupCategoryTestRedis() *redis.Client {
	s, err := miniredis.Run()
	if err != nil {
		panic(err)
	}
	return redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})
}

// MockCategoryRepo is a manual mock implementing CategoryRepository for testing.
type MockCategoryRepo struct {
	GetAllCategoriesFunc  func(ctx context.Context) ([]models.Category, error)
	GetDistinctBrandsFunc func(ctx context.Context) ([]string, error)
}

func (m *MockCategoryRepo) GetAllCategories(ctx context.Context) ([]models.Category, error) {
	if m.GetAllCategoriesFunc != nil {
		return m.GetAllCategoriesFunc(ctx)
	}
	return nil, nil
}
func (m *MockCategoryRepo) GetDistinctBrands(ctx context.Context) ([]string, error) {
	if m.GetDistinctBrandsFunc != nil {
		return m.GetDistinctBrandsFunc(ctx)
	}
	return nil, nil
}

func TestCategoryService_GetAllCategories_CacheMissAndHit(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCategoryRepo := &MockCategoryRepo{}
	db := setupCategoryTestRedis()

	categoryService := service.NewCategoryService(mockCategoryRepo, db)

	expectedCategories := []models.Category{
		{CategoryId: 1, Name: "Electronics"},
		{CategoryId: 2, Name: "Apparel"},
	}

	callCount := 0
	mockCategoryRepo.GetAllCategoriesFunc = func(ctx context.Context) ([]models.Category, error) {
		callCount++
		return expectedCategories, nil
	}

	// 1. Cache Miss (queries repo)
	cats1, err := categoryService.GetAllCategories(context.Background())
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(cats1) != 2 {
		t.Errorf("Expected 2 categories, got %d", len(cats1))
	}
	if callCount != 1 {
		t.Errorf("Expected repo to be called once, got %d", callCount)
	}

	// 2. Cache Hit (should skip repo and read from miniredis)
	cats2, err := categoryService.GetAllCategories(context.Background())
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(cats2) != 2 {
		t.Errorf("Expected 2 categories, got %d", len(cats2))
	}
	if callCount != 1 {
		t.Errorf("Expected repo to be called once, got %d", callCount)
	}
}

func TestCategoryService_GetDistinctBrands_CacheMissAndHit(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockCategoryRepo := &MockCategoryRepo{}
	db := setupCategoryTestRedis()

	categoryService := service.NewCategoryService(mockCategoryRepo, db)

	expectedBrands := []string{"Sony", "Nike"}

	callCount := 0
	mockCategoryRepo.GetDistinctBrandsFunc = func(ctx context.Context) ([]string, error) {
		callCount++
		return expectedBrands, nil
	}

	// 1. Cache Miss
	brands1, err := categoryService.GetDistinctBrands(context.Background())
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(brands1) != 2 {
		t.Errorf("Expected 2 brands, got %d", len(brands1))
	}
	if callCount != 1 {
		t.Errorf("Expected repo to be called once, got %d", callCount)
	}

	// 2. Cache Hit
	brands2, err := categoryService.GetDistinctBrands(context.Background())
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(brands2) != 2 {
		t.Errorf("Expected 2 brands, got %d", len(brands2))
	}
	if callCount != 1 {
		t.Errorf("Expected repo to be called once, got %d", callCount)
	}
}
