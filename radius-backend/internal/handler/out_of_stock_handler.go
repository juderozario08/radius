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
