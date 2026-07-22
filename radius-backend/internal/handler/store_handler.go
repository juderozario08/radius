// radius-backend/internal/handler/store_handler.go
package handler

import (
	"net/http"
	"radius/internal/service"

	"github.com/gin-gonic/gin"
)

type StoreHandler struct {
	storeService *service.StoreService
}

func NewStoreHandler(storeService *service.StoreService) *StoreHandler {
	return &StoreHandler{
		storeService: storeService,
	}
}

func (h *StoreHandler) GetAllStores(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"message": "Retrieved all stores"})
}

func (h *StoreHandler) UpdateStore(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"message": "Updated Store"})
}

func (h *StoreHandler) CreateStore(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"message": "Created new store"})
}

func (h *StoreHandler) ManageEmployees(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"message": "Managed new store"})
}

func (h *StoreHandler) GetStore(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"message": "Retrieved store"})
}
