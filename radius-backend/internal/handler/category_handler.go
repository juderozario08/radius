// radius-backend/internal/handler/category_handler.go
package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"

	"github.com/gin-gonic/gin"
)

type CategoryHandler struct {
	categoryService *service.CategoryService
}

func NewCategoryHandler(categoryService *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{
		categoryService: categoryService,
	}
}

func (h *CategoryHandler) GetAllCategories(ctx *gin.Context) {
	categories, err := h.categoryService.GetAllCategories(ctx.Request.Context())
	if err != nil {
		log.Printf("[ERROR] CategoryHandler.GetAllCategories (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	if categories == nil {
		categories = []models.Category{}
	}

	ctx.JSON(http.StatusOK, categories)
}

func (h *CategoryHandler) GetDistinctBrands(ctx *gin.Context) {
	brands, err := h.categoryService.GetDistinctBrands(ctx.Request.Context())
	if err != nil {
		log.Printf("[ERROR] CategoryHandler.GetDistinctBrands (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	if brands == nil {
		brands = []string{}
	}

	ctx.JSON(http.StatusOK, brands)
}
