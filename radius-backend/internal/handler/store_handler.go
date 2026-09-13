package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"strconv"

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
		log.Printf("[ERROR] StoreHandler.GetAllStores (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, response)
}

func (h *StoreHandler) UpdateStore(ctx *gin.Context) {
	var body models.UpdateStoreRequest
	err := ctx.ShouldBindJSON(&body)
	if err != nil {
		log.Printf("[ERROR] StoreHandler.UpdateStore (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	if idStr := ctx.Param("id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
			body.StoreId = id
		}
	}

	res, err := h.storeService.UpdateStore(ctx.Request.Context(), body)
	if err != nil {
		log.Printf("[ERROR] StoreHandler.UpdateStore (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (h *StoreHandler) CreateStore(ctx *gin.Context) {
	var body models.CreateStoreRequest
	err := ctx.ShouldBindJSON(&body)
	if err != nil {
		log.Printf("[ERROR] StoreHandler.CreateStore (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	res, err := h.storeService.CreateStore(ctx.Request.Context(), body)
	if err != nil {
		log.Printf("[ERROR] StoreHandler.CreateStore (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	ctx.JSON(http.StatusCreated, res)
}

func (h *StoreHandler) GetStore(ctx *gin.Context) {
	storeId := ctx.Param("id")
	if storeId == "" {
		log.Printf("[ERROR] StoreHandler.GetStore: Query parameter store_id not found")
		storeId = ctx.Query("store_id")
	}
	if storeId == "" {
		log.Printf("[ERROR] StoreHandler.GetStore: store_id parameter not found")
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid Request"})
		return
	}
	res, err := h.storeService.GetStore(ctx.Request.Context(), storeId)
	if err != nil {
		log.Printf("[ERROR] StoreHandler.GetStore (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (h *StoreHandler) ActivateStore(ctx *gin.Context) {
	var storeID int
	if idStr := ctx.Param("id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
			storeID = id
		}
	}

	if storeID == 0 {
		var body models.StoreIdRequest
		err := ctx.ShouldBindJSON(&body)
		if err != nil {
			log.Printf("[ERROR] StoreHandler.ActivateStore (BindJSON): %v", err)
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
			return
		}
		storeID = body.StoreId
	}

	res, err := h.storeService.ActivateStore(ctx.Request.Context(), storeID)
	if err != nil {
		log.Printf("[ERROR] StoreHandler.ActivateStore (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (h *StoreHandler) DeactivateStore(ctx *gin.Context) {
	var storeID int
	if idStr := ctx.Param("id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
			storeID = id
		}
	}

	if storeID == 0 {
		var body models.StoreIdRequest
		err := ctx.ShouldBindJSON(&body)
		if err != nil {
			log.Printf("[ERROR] StoreHandler.DeactivateStore (BindJSON): %v", err)
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
			return
		}
		storeID = body.StoreId
	}

	res, err := h.storeService.DeactivateStore(ctx.Request.Context(), storeID)
	if err != nil {
		log.Printf("[ERROR] StoreHandler.DeactivateStore (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (h *StoreHandler) GetStoreOperations(ctx *gin.Context) {
	operations, err := h.storeService.GetStoreOperations(ctx.Request.Context())
	if err != nil {
		log.Printf("[ERROR] StoreHandler.GetStoreOperations (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to retrieve store operations"})
		return
	}
	ctx.JSON(http.StatusOK, operations)
}
