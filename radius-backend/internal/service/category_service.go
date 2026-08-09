// radius-backend/internal/service/category_service.go
package service

import (
	"context"
	"radius/internal/models"
)

type CategoryService struct {
	categoryRepo CategoryRepository
}

func NewCategoryService(categoryRepo CategoryRepository) *CategoryService {
	return &CategoryService{
		categoryRepo: categoryRepo,
	}
}

func (s *CategoryService) GetAllCategories(ctx context.Context) ([]models.Category, error) {
	return s.categoryRepo.GetAllCategories(ctx)
}

func (s *CategoryService) GetDistinctBrands(ctx context.Context) ([]string, error) {
	return s.categoryRepo.GetDistinctBrands(ctx)
}
