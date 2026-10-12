package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"radius/internal/api"
	"radius/internal/models"
	"radius/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ReceivingHandler struct {
	receivingService *service.ReceivingService
}

func NewReceivingHandler(receivingService *service.ReceivingService) *ReceivingHandler {
	return &ReceivingHandler{
		receivingService: receivingService,
	}
}

func (h *ReceivingHandler) GetPurchaseOrders(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	role := ctx.GetString("role")

	var storeIDOverride *int
	if storeIDStr := ctx.Query("store_id"); storeIDStr != "" {
		if sid, err := strconv.Atoi(storeIDStr); err == nil {
			storeIDOverride = &sid
		}
	}

	results, err := h.receivingService.GetPurchaseOrders(ctx.Request.Context(), storeId, role, storeIDOverride)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "ReceivingHandler.GetPurchaseOrders failed", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"purchase_orders": results})
}

func (h *ReceivingHandler) GetPurchaseOrderDetail(ctx *gin.Context) {
	poIDStr := ctx.Param("id")
	poID, err := strconv.Atoi(poIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid po_id"})
		return
	}

	detail, err := h.receivingService.GetPurchaseOrderDetail(ctx.Request.Context(), poID)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "ReceivingHandler.GetPurchaseOrderDetail failed", "error", err)
		if errors.Is(err, service.ErrNotFound) {
			ctx.JSON(http.StatusNotFound, models.APIError{Error: "Request could not be completed"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, detail)
}

func (h *ReceivingHandler) CheckProductInPO(ctx *gin.Context) {
	poIDStr := ctx.Param("id")
	barcode := ctx.Query("barcode")
	if barcode == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "barcode is required"})
		return
	}
	poID, err := strconv.Atoi(poIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid po_id"})
		return
	}

	result, err := h.receivingService.CheckProductInPO(ctx.Request.Context(), poID, barcode)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "ReceivingHandler.CheckProductInPO failed", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

func (h *ReceivingHandler) ReceivePO(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := ctx.GetString("role")

	var req models.ReceivePORequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	id, ok := pathID(ctx, "id")
	if !ok {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}
	req.PoId = id

	err := h.receivingService.ReceivePO(ctx.Request.Context(), storeId, employeeId, role, req)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "ReceivingHandler.ReceivePO failed", "error", err)
		if errors.Is(err, service.ErrNotFound) || errors.Is(err, service.ErrValidation) {
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	api.Message(ctx, http.StatusOK, "PO items received successfully")
}

func (h *ReceivingHandler) ReceiveLPR(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := ctx.GetString("role")

	var req models.ReceiveLPRRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	id, ok := pathID(ctx, "id")
	if !ok {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}
	req.PoId = id

	err := h.receivingService.ReceiveLPR(ctx.Request.Context(), storeId, employeeId, role, req)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "ReceivingHandler.ReceiveLPR failed", "error", err)
		if errors.Is(err, service.ErrNotFound) || errors.Is(err, service.ErrValidation) {
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	api.Message(ctx, http.StatusOK, "LPR received successfully")
}

func (h *ReceivingHandler) GetStockTransfers(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	role := ctx.GetString("role")

	results, err := h.receivingService.GetStockTransfers(ctx.Request.Context(), storeId, role)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "ReceivingHandler.GetStockTransfers failed", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"transfers": results})
}

func (h *ReceivingHandler) GetStockTransferDetail(ctx *gin.Context) {
	transferIDStr := ctx.Param("id")
	transferID, err := strconv.Atoi(transferIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid transfer_id"})
		return
	}

	detail, err := h.receivingService.GetStockTransferDetail(ctx.Request.Context(), transferID)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "ReceivingHandler.GetStockTransferDetail failed", "error", err)
		if errors.Is(err, service.ErrNotFound) {
			ctx.JSON(http.StatusNotFound, models.APIError{Error: "Request could not be completed"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, detail)
}

func (h *ReceivingHandler) ReceiveTransfer(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")

	var req models.ReceiveTransferRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	id, ok := pathID(ctx, "id")
	if !ok {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}
	req.TransferId = id

	err := h.receivingService.ReceiveTransfer(ctx.Request.Context(), storeId, employeeId, req)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "ReceivingHandler.ReceiveTransfer failed", "error", err)
		if errors.Is(err, service.ErrNotFound) || errors.Is(err, service.ErrValidation) {
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	api.Message(ctx, http.StatusOK, "Transfer items received successfully")
}

func (h *ReceivingHandler) QuickReceiveTransfer(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")

	id, ok := pathID(ctx, "id")
	if !ok {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	err := h.receivingService.QuickReceiveTransfer(ctx.Request.Context(), storeId, employeeId, models.QuickReceiveTransferRequest{TransferId: id})
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "ReceivingHandler.QuickReceiveTransfer failed", "error", err)
		if errors.Is(err, service.ErrNotFound) || errors.Is(err, service.ErrValidation) {
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	api.Message(ctx, http.StatusOK, "Transfer received successfully")
}

func (h *ReceivingHandler) CheckProductInTransfer(ctx *gin.Context) {
	transferIDStr := ctx.Param("id")
	barcode := ctx.Query("barcode")
	if barcode == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "barcode is required"})
		return
	}
	transferID, err := strconv.Atoi(transferIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid transfer_id"})
		return
	}

	result, err := h.receivingService.CheckProductInTransfer(ctx.Request.Context(), transferID, barcode)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "ReceivingHandler.CheckProductInTransfer failed", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, result)
}
