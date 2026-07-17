//radius-backend/internal/handler/store_handler.go
package handler

import "radius/internal/service"

type StoreHandler struct {
	storeService *service.StoreService
}

func NewStoreHandler(storeService *service.StoreService) *StoreHandler {
	return &StoreHandler{
		storeService: storeService,
	}
}
