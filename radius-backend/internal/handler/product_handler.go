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
