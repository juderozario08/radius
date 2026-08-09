//radius-backend/internal/handler/product_handler.go
package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ProductHandler struct {
	productService *service.ProductService
}

func NewProductHandler(productService *service.ProductService) *ProductHandler {
	return &ProductHandler{
		productService: productService,
	}
}

func (h *ProductHandler) GetProductByID(ctx *gin.Context) {
	idStr := ctx.Query("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		log.Printf("[ERROR] ProductHandler.GetProductByID (Atoi): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid product ID"})
		return
	}

	product, err := h.productService.GetProductByID(ctx.Request.Context(), id)
	if err != nil {
		log.Printf("[ERROR] ProductHandler.GetProductByID (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	if product == nil {
		log.Printf("[ERROR] ProductHandler.GetProductByID: Product not found")
		ctx.JSON(http.StatusNotFound, models.APIError{Error: "Product not found"})
		return
	}

	ctx.JSON(http.StatusOK, product)
}

func (h *ProductHandler) SearchProducts(ctx *gin.Context) {
	query := ctx.Query("q")

	var categoryID *int
	if catStr := ctx.Query("category_id"); catStr != "" {
		catVal, err := strconv.Atoi(catStr)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid category_id"})
			return
		}
		categoryID = &catVal
	}

	var brand *string
	if b := ctx.Query("brand"); b != "" {
		brand = &b
	}

	var isActive *bool
	if activeStr := ctx.Query("is_active"); activeStr != "" {
		val := activeStr == "true"
		isActive = &val
	}

	var unitOfMeasure *string
	if uom := ctx.Query("unit_of_measure"); uom != "" {
		unitOfMeasure = &uom
	}

	limit := 25
	if limitStr := ctx.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	offset := 0
	if offsetStr := ctx.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	products, total, err := h.productService.SearchProducts(
		ctx.Request.Context(),
		query, categoryID, brand, isActive, unitOfMeasure,
		limit, offset,
	)
	if err != nil {
		log.Printf("[ERROR] ProductHandler.SearchProducts (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	if products == nil {
		products = []models.Product{}
	}

	ctx.JSON(http.StatusOK, gin.H{
		"products": products,
		"total":    total,
	})
}

