package handler

import (
	"log/slog"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/utils"
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
		slog.ErrorContext(ctx.Request.Context(), "StoreHandler.GetAllStores: service error", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	utils.RenderJSONWithETag(ctx, http.StatusOK, response, "private, must-revalidate")
}

func (h *StoreHandler) UpdateStore(ctx *gin.Context) {
	var body models.UpdateStoreRequest
	err := ctx.ShouldBindJSON(&body)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "StoreHandler.UpdateStore: invalid request body", "error", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	id, ok := pathID(ctx, "id")
	if !ok {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}
	body.StoreId = id

	res, err := h.storeService.UpdateStore(ctx.Request.Context(), body)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "StoreHandler.UpdateStore: service error", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (h *StoreHandler) CreateStore(ctx *gin.Context) {
	var body models.CreateStoreRequest
	err := ctx.ShouldBindJSON(&body)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "StoreHandler.CreateStore: invalid request body", "error", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	res, err := h.storeService.CreateStore(ctx.Request.Context(), body)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "StoreHandler.CreateStore: service error", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	ctx.JSON(http.StatusCreated, res)
}

func (h *StoreHandler) GetStore(ctx *gin.Context) {
	storeId := ctx.Param("id")
	res, err := h.storeService.GetStore(ctx.Request.Context(), storeId)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "StoreHandler.GetStore: service error", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (h *StoreHandler) ActivateStore(ctx *gin.Context) {
	storeID, ok := pathID(ctx, "id")
	if !ok {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	res, err := h.storeService.ActivateStore(ctx.Request.Context(), storeID)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "StoreHandler.ActivateStore: service error", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (h *StoreHandler) DeactivateStore(ctx *gin.Context) {
	storeID, ok := pathID(ctx, "id")
	if !ok {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	res, err := h.storeService.DeactivateStore(ctx.Request.Context(), storeID)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "StoreHandler.DeactivateStore: service error", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (h *StoreHandler) GetStoreOperations(ctx *gin.Context) {
	var storeIDOpt []int
	if storeIDStr := ctx.Query("store_id"); storeIDStr != "" {
		if id, err := strconv.Atoi(storeIDStr); err == nil && id > 0 {
			storeIDOpt = append(storeIDOpt, id)
		}
	}
	operations, err := h.storeService.GetStoreOperations(ctx.Request.Context(), storeIDOpt...)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "StoreHandler.GetStoreOperations: service error", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to retrieve store operations"})
		return
	}
	ctx.JSON(http.StatusOK, operations)
}
