package service_test

import (
	"context"
	"errors"
	"radius/internal/models"
	"radius/internal/service"
	"sync"
	"sync/atomic"
	"testing"
	"time"

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

type MockCategoryRepo struct {
	GetAllCategoriesFunc  func(ctx context.Context) ([]models.Category, error)
	GetDistinctBrandsFunc func(ctx context.Context) ([]string, error)
	CreateCategoryFunc    func(ctx context.Context, name string, parentID *int) (*models.Category, error)
	UpdateCategoryFunc    func(ctx context.Context, id int, name string, parentID *int) error
	DeleteCategoryFunc    func(ctx context.Context, id int) error
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
func (m *MockCategoryRepo) CreateCategory(ctx context.Context, name string, parentID *int) (*models.Category, error) {
	if m.CreateCategoryFunc != nil {
		return m.CreateCategoryFunc(ctx, name, parentID)
	}
	return nil, nil
}
func (m *MockCategoryRepo) UpdateCategory(ctx context.Context, id int, name string, parentID *int) error {
	if m.UpdateCategoryFunc != nil {
		return m.UpdateCategoryFunc(ctx, id, name, parentID)
	}
	return nil
}
func (m *MockCategoryRepo) DeleteCategory(ctx context.Context, id int) error {
	if m.DeleteCategoryFunc != nil {
		return m.DeleteCategoryFunc(ctx, id)
	}
	return nil
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

func TestCategoryService_GetAllCategories_SingleflightDeduplication(t *testing.T) {
	mockCategoryRepo := &MockCategoryRepo{}
	db := setupCategoryTestRedis()

	categoryService := service.NewCategoryService(mockCategoryRepo, db)

	expectedCategories := []models.Category{
		{CategoryId: 1, Name: "Electronics"},
		{CategoryId: 2, Name: "Apparel"},
	}

	var callCount int64
	mockCategoryRepo.GetAllCategoriesFunc = func(ctx context.Context) ([]models.Category, error) {
		atomic.AddInt64(&callCount, 1)
		time.Sleep(50 * time.Millisecond)
		return expectedCategories, nil
	}

	concurrency := 30
	var wg sync.WaitGroup
	errCh := make(chan error, concurrency)

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			cats, err := categoryService.GetAllCategories(context.Background())
			if err != nil {
				errCh <- err
				return
			}
			if len(cats) != 2 {
				t.Errorf("Expected 2 categories, got %d", len(cats))
			}
		}()
	}

	wg.Wait()
	close(errCh)

	for err := range errCh {
		if err != nil {
			t.Fatalf("Concurrent call failed: %v", err)
		}
	}

	if atomic.LoadInt64(&callCount) != 1 {
		t.Errorf("Expected exactly 1 DB call due to singleflight deduplication, got %d", atomic.LoadInt64(&callCount))
	}
}

func TestCategoryService_GetAllCategories_NilRedisClient(t *testing.T) {
	mockCategoryRepo := &MockCategoryRepo{}
	categoryService := service.NewCategoryService(mockCategoryRepo, nil)

	expectedCategories := []models.Category{
		{CategoryId: 1, Name: "Electronics"},
	}

	mockCategoryRepo.GetAllCategoriesFunc = func(ctx context.Context) ([]models.Category, error) {
		return expectedCategories, nil
	}

	cats, err := categoryService.GetAllCategories(context.Background())
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(cats) != 1 {
		t.Errorf("Expected 1 category, got %d", len(cats))
	}
}

func TestCategoryService_GetAllCategories_RedisFailOpen(t *testing.T) {
	s, err := miniredis.Run()
	if err != nil {
		t.Fatalf("Failed to run miniredis: %v", err)
	}
	client := redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})
	s.Close()

	mockCategoryRepo := &MockCategoryRepo{}
	categoryService := service.NewCategoryService(mockCategoryRepo, client)

	expectedCategories := []models.Category{
		{CategoryId: 1, Name: "Electronics"},
	}

	mockCategoryRepo.GetAllCategoriesFunc = func(ctx context.Context) ([]models.Category, error) {
		return expectedCategories, nil
	}

	cats, err := categoryService.GetAllCategories(context.Background())
	if err != nil {
		t.Fatalf("Expected fail-open to succeed without error, got %v", err)
	}
	if len(cats) != 1 {
		t.Errorf("Expected 1 category, got %d", len(cats))
	}
}

func TestCategoryService_Mutations_InvalidateCategoriesCache(t *testing.T) {
	rdb := setupCategoryTestRedis()
	mockCategoryRepo := &MockCategoryRepo{}
	categoryService := service.NewCategoryService(mockCategoryRepo, rdb)
	ctx := context.Background()

	_ = rdb.Set(ctx, "radius:v1:catalog:categories", `[{"category_id":1,"name":"Old"}]`, time.Hour).Err()
	mockCategoryRepo.CreateCategoryFunc = func(ctx context.Context, name string, parentID *int) (*models.Category, error) {
		return &models.Category{CategoryId: 2, Name: name}, nil
	}

	_, err := categoryService.CreateCategory(ctx, "New Cat", nil)
	if err != nil {
		t.Fatalf("CreateCategory failed: %v", err)
	}
	if exists := rdb.Exists(ctx, "radius:v1:catalog:categories").Val(); exists != 0 {
		t.Errorf("Expected categories cache to be invalidated on create")
	}

	_ = rdb.Set(ctx, "radius:v1:catalog:categories", `[{"category_id":1,"name":"Old"}]`, time.Hour).Err()
	mockCategoryRepo.UpdateCategoryFunc = func(ctx context.Context, id int, name string, parentID *int) error {
		return nil
	}
	err = categoryService.UpdateCategory(ctx, 1, "Updated Cat", nil)
	if err != nil {
		t.Fatalf("UpdateCategory failed: %v", err)
	}
	if exists := rdb.Exists(ctx, "radius:v1:catalog:categories").Val(); exists != 0 {
		t.Errorf("Expected categories cache to be invalidated on update")
	}

	_ = rdb.Set(ctx, "radius:v1:catalog:categories", `[{"category_id":1,"name":"Old"}]`, time.Hour).Err()
	mockCategoryRepo.DeleteCategoryFunc = func(ctx context.Context, id int) error {
		return nil
	}
	err = categoryService.DeleteCategory(ctx, 1)
	if err != nil {
		t.Fatalf("DeleteCategory failed: %v", err)
	}
	if exists := rdb.Exists(ctx, "radius:v1:catalog:categories").Val(); exists != 0 {
		t.Errorf("Expected categories cache to be invalidated on delete")
	}
}

func TestCategoryService_Mutations_DBFailurePreservesCache(t *testing.T) {
	rdb := setupCategoryTestRedis()
	mockCategoryRepo := &MockCategoryRepo{}
	categoryService := service.NewCategoryService(mockCategoryRepo, rdb)
	ctx := context.Background()

	_ = rdb.Set(ctx, "radius:v1:catalog:categories", `[{"category_id":1,"name":"Old"}]`, time.Hour).Err()
	mockCategoryRepo.CreateCategoryFunc = func(ctx context.Context, name string, parentID *int) (*models.Category, error) {
		return nil, errors.New("db error")
	}

	_, err := categoryService.CreateCategory(ctx, "New Cat", nil)
	if err == nil {
		t.Fatalf("Expected error, got nil")
	}
	if exists := rdb.Exists(ctx, "radius:v1:catalog:categories").Val(); exists == 0 {
		t.Errorf("Expected categories cache to be preserved on DB error")
	}
}
