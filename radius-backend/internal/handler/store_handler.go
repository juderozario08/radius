// radius-backend/internal/handler/store_handler.go
package handler

import (
	"log"
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
	response, err := h.storeService.GetAllStores(
		ctx.Request.Context(),
		ctx.DefaultQuery("page_size", "10"),
		ctx.DefaultQuery("page_number", "1"),
	)
	if err != nil {
		log.Println(err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, response)
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

func (h *StoreHandler) ActivateStore(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"message": "Activated Store"})
}

func (h *StoreHandler) DeactivateStore(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"message": "Deactivated Store"})
}
