//radius-backend/internal/handler/out_of_stock_handler.go
package handler

import "radius/internal/service"

type OutOfStockHandler struct {
	outOfStockService *service.OutOfStockService
}

func NewOutOfStockHandler(outOfStockService *service.OutOfStockService) *OutOfStockHandler {
	return &OutOfStockHandler{
		outOfStockService: outOfStockService,
	}
}
