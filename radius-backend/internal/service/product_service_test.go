package service_test

import (
	"context"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"testing"

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

// MockProductRepo is a manual mock implementing ProductRepository for testing.
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

	// Cache Miss: Query DB
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

	// Cache Hit: Should NOT query DB, should fetch straight from Redis
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
