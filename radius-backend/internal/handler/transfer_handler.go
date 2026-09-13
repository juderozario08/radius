package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type TransferHandler struct {
	transferService *service.TransferService
}

func NewTransferHandler(transferService *service.TransferService) *TransferHandler {
	return &TransferHandler{
		transferService: transferService,
	}
}

func (h *TransferHandler) GetOutboundTransfers(ctx *gin.Context) {
	email := ctx.GetString("email")

	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "10"))
	pageNumber, _ := strconv.Atoi(ctx.DefaultQuery("page_number", "1"))

	var filterStoreID *int
	if storeIDStr := ctx.Query("store_id"); storeIDStr != "" {
		if id, err := strconv.Atoi(storeIDStr); err == nil && id > 0 {
			filterStoreID = &id
		}
	}

	results, total, err := h.transferService.GetOutboundTransfers(ctx.Request.Context(), email, pageSize, pageNumber, filterStoreID)
	if err != nil {
		log.Printf("[ERROR] TransferHandler.GetOutboundTransfers: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to retrieve stock transfers"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"transfers":    results,
		"total_length": total,
	})
}

func (h *TransferHandler) GetOutboundTransferDetail(ctx *gin.Context) {
	email := ctx.GetString("email")

	transferIDStr := ctx.Param("id")
	if transferIDStr == "" {
		transferIDStr = ctx.Query("transfer_id")
	}
	if transferIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "transfer_id is required"})
		return
	}
	transferID, err := strconv.Atoi(transferIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid transfer_id"})
		return
	}

	detail, err := h.transferService.GetOutboundTransferDetail(ctx.Request.Context(), email, transferID)
	if err != nil {
		log.Printf("[ERROR] TransferHandler.GetOutboundTransferDetail: %v", err)
		if err.Error() == "transfer not found" {
			ctx.JSON(http.StatusNotFound, models.APIError{Error: err.Error()})
			return
		}
		if err.Error() == "unauthorized to view this transfer" {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to retrieve transfer details"})
		return
	}

	ctx.JSON(http.StatusOK, detail)
}

func (h *TransferHandler) CreateTransfer(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.CreateTransferRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	transfer, err := h.transferService.CreateTransfer(ctx.Request.Context(), email, req)
	if err != nil {
		log.Printf("[ERROR] TransferHandler.CreateTransfer: %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"transfer": transfer,
		"message":  "Transfer created successfully",
	})
}

func (h *TransferHandler) DispatchTransfer(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.DispatchTransferRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	if idStr := ctx.Param("id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
			req.TransferId = id
		}
	}

	err := h.transferService.DispatchTransfer(ctx.Request.Context(), email, req)
	if err != nil {
		log.Printf("[ERROR] TransferHandler.DispatchTransfer: %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "Transfer dispatched successfully",
	})
}

func (h *TransferHandler) CancelTransfer(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.CancelTransferRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	if idStr := ctx.Param("id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
			req.TransferId = id
		}
	}

	err := h.transferService.CancelTransfer(ctx.Request.Context(), email, req)
	if err != nil {
		log.Printf("[ERROR] TransferHandler.CancelTransfer: %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "Transfer cancelled successfully",
	})
}

func (h *TransferHandler) GetDestinationStores(ctx *gin.Context) {
	email := ctx.GetString("email")

	var fromStoreID *int
	if storeIDStr := ctx.Query("from_store_id"); storeIDStr != "" {
		if id, err := strconv.Atoi(storeIDStr); err == nil && id > 0 {
			fromStoreID = &id
		}
	}

	stores, err := h.transferService.GetDestinationStores(ctx.Request.Context(), email, fromStoreID)
	if err != nil {
		log.Printf("[ERROR] TransferHandler.GetDestinationStores: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to retrieve stores"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"stores": stores,
	})
}
