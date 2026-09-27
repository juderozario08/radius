package service_test

import (
	"context"
	"fmt"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/mock/gomock"
)

func setupProductTestRedis() *redis.Client {
	s, err := miniredis.Run()
	if err != nil {
		panic(err)
	}
	return redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})
}

type MockProductRepo struct {
	GetProductByIDFunc func(ctx context.Context, id int) (*models.Product, error)
	SearchProductsFunc func(ctx context.Context, query string, categoryID *int, brand *string, isActive *bool, unitOfMeasure *string, limit, offset int) ([]models.Product, int, error)
}

func (m *MockProductRepo) GetProductByID(ctx context.Context, id int) (*models.Product, error) {
	if m.GetProductByIDFunc != nil {
		return m.GetProductByIDFunc(ctx, id)
	}
	return nil, nil
}
func (m *MockProductRepo) SearchProducts(ctx context.Context, query string, categoryID *int, brand *string, isActive *bool, unitOfMeasure *string, limit, offset int) ([]models.Product, int, error) {
	if m.SearchProductsFunc != nil {
		return m.SearchProductsFunc(ctx, query, categoryID, brand, isActive, unitOfMeasure, limit, offset)
	}
	return nil, 0, nil
}
func (m *MockProductRepo) GetProductByBarcode(ctx context.Context, barcode string) (*models.Product, error) {
	return nil, nil
}

func TestProductService_GetProductByID_CacheMissAndHit(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockProductRepo := &MockProductRepo{}
	mockStoreRepo := mocks.NewMockStoreRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockSessionRepo := mocks.NewMockSessionRepository(ctrl)

	db := setupProductTestRedis()

	productService := service.NewProductService(mockProductRepo, mockStoreRepo, mockEmployeeRepo, mockSessionRepo, db)

	expectedProduct := &models.Product{
		ProductId: 1,
		Name:      "Test Product",
	}

	callCount := 0
	mockProductRepo.GetProductByIDFunc = func(ctx context.Context, id int) (*models.Product, error) {
		callCount++
		return expectedProduct, nil
	}

	prod1, err := productService.GetProductByID(context.Background(), 1)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if prod1.Name != "Test Product" {
		t.Errorf("Expected product name 'Test Product', got %s", prod1.Name)
	}
	if callCount != 1 {
		t.Errorf("Expected repo to be called once, got %d", callCount)
	}

	prod2, err := productService.GetProductByID(context.Background(), 1)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if prod2.Name != "Test Product" {
		t.Errorf("Expected product name 'Test Product', got %s", prod2.Name)
	}
	if callCount != 1 {
		t.Errorf("Expected repo to be called once, got %d", callCount)
	}
}

func TestProductService_GetProductByID_SingleflightDeduplication(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockProductRepo := &MockProductRepo{}
	mockStoreRepo := mocks.NewMockStoreRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockSessionRepo := mocks.NewMockSessionRepository(ctrl)

	db := setupProductTestRedis()

	productService := service.NewProductService(mockProductRepo, mockStoreRepo, mockEmployeeRepo, mockSessionRepo, db)

	expectedProduct := &models.Product{
		ProductId: 42,
		Name:      "Singleflight Product",
	}

	var callCount int64
	mockProductRepo.GetProductByIDFunc = func(ctx context.Context, id int) (*models.Product, error) {
		atomic.AddInt64(&callCount, 1)
		time.Sleep(50 * time.Millisecond)
		return expectedProduct, nil
	}

	const concurrency = 10
	var wg sync.WaitGroup
	errs := make(chan error, concurrency)

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			prod, err := productService.GetProductByID(context.Background(), 42)
			if err != nil {
				errs <- err
				return
			}
			if prod.Name != "Singleflight Product" {
				errs <- fmt.Errorf("unexpected name: %s", prod.Name)
			}
		}()
	}

	wg.Wait()
	close(errs)

	for err := range errs {
		t.Fatalf("Concurrent call failed: %v", err)
	}

	if atomic.LoadInt64(&callCount) != 1 {
		t.Errorf("Expected singleflight to collapse calls into 1, got %d", atomic.LoadInt64(&callCount))
	}
}

func TestProductService_GetProductByID_NilRedisClient(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockProductRepo := &MockProductRepo{}
	mockStoreRepo := mocks.NewMockStoreRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockSessionRepo := mocks.NewMockSessionRepository(ctrl)

	productService := service.NewProductService(mockProductRepo, mockStoreRepo, mockEmployeeRepo, mockSessionRepo, nil)

	expectedProduct := &models.Product{
		ProductId: 10,
		Name:      "Nil Redis Product",
	}

	mockProductRepo.GetProductByIDFunc = func(ctx context.Context, id int) (*models.Product, error) {
		return expectedProduct, nil
	}

	prod, err := productService.GetProductByID(context.Background(), 10)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if prod.Name != "Nil Redis Product" {
		t.Errorf("Expected product name 'Nil Redis Product', got %s", prod.Name)
	}
}

func TestProductService_GetProductByID_RedisFailOpen(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	s, err := miniredis.Run()
	if err != nil {
		t.Fatalf("Failed to run miniredis: %v", err)
	}
	client := redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})
	s.Close()

	mockProductRepo := &MockProductRepo{}
	mockStoreRepo := mocks.NewMockStoreRepository(ctrl)
	mockEmployeeRepo := mocks.NewMockEmployeeRepository(ctrl)
	mockSessionRepo := mocks.NewMockSessionRepository(ctrl)

	productService := service.NewProductService(mockProductRepo, mockStoreRepo, mockEmployeeRepo, mockSessionRepo, client)

	expectedProduct := &models.Product{
		ProductId: 20,
		Name:      "FailOpen Product",
	}

	mockProductRepo.GetProductByIDFunc = func(ctx context.Context, id int) (*models.Product, error) {
		return expectedProduct, nil
	}

	prod, err := productService.GetProductByID(context.Background(), 20)
	if err != nil {
		t.Fatalf("Expected fail-open to succeed without error, got %v", err)
	}
	if prod.Name != "FailOpen Product" {
		t.Errorf("Expected product name 'FailOpen Product', got %s", prod.Name)
	}
}

