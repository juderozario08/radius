//radius-backend/internal/handler/product_handler.go
package handler

import "radius/internal/service"

type ProductHandler struct {
	productService *service.ProductService
}

func NewProductHandler(productService *service.ProductService) *ProductHandler {
	return &ProductHandler{
		productService: productService,
	}
}
