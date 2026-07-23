// radius-backend/internal/handler/store_handler.go
package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
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
	var body models.UpdateStoreRequest
	err := ctx.ShouldBindJSON(&body)
	if err != nil {
		log.Println("Error binding JSON: ", err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := h.storeService.UpdateStore(ctx.Request.Context(), body)
	if err != nil {
		log.Println("Error: ", err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (h *StoreHandler) CreateStore(ctx *gin.Context) {
	var body models.CreateStoreRequest
	err := ctx.ShouldBindJSON(&body)
	if err != nil {
		log.Println("Error binding JSON: ", err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := h.storeService.CreateStore(ctx.Request.Context(), body)
	if err != nil {
		log.Println("Error: ", err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (h *StoreHandler) GetStore(ctx *gin.Context) {
	storeId := ctx.Query("store_id")
	if storeId == "" {
		log.Println("Query parameter store_id not found")
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
	}
	res, err := h.storeService.GetStore(ctx, storeId)
	if err != nil {
		log.Println("Error: ", err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (h *StoreHandler) ActivateStore(ctx *gin.Context) {
	var body models.ActivateStoreRequest
	err := ctx.ShouldBindJSON(&body)
	if err != nil {
		log.Println("Error binding JSON: ", err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := h.storeService.ActivateStore(ctx.Request.Context(), body.StoreId)
	if err != nil {
		log.Println("Error: ", err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (h *StoreHandler) DeactivateStore(ctx *gin.Context) {
	var body models.DeactivateStoreRequest
	err := ctx.ShouldBindJSON(&body)
	if err != nil {
		log.Println("Error binding JSON: ", err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := h.storeService.DeactivateStore(ctx.Request.Context(), body.StoreId)
	if err != nil {
		log.Println("Error: ", err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, res)
}
