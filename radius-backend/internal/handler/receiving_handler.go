// radius-backend/internal/handler/receiving_handler.go
package handler

import (
	"log"
	"net/http"
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
	email := ctx.GetString("email")

	results, err := h.receivingService.GetPurchaseOrders(ctx.Request.Context(), email)
	if err != nil {
		log.Printf("[ERROR] ReceivingHandler.GetPurchaseOrders: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"purchase_orders": results})
}

func (h *ReceivingHandler) GetPurchaseOrderDetail(ctx *gin.Context) {
	email := ctx.GetString("email")

	poIDStr := ctx.Query("po_id")
	if poIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "po_id is required"})
		return
	}
	poID, err := strconv.Atoi(poIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid po_id"})
		return
	}

	detail, err := h.receivingService.GetPurchaseOrderDetail(ctx.Request.Context(), email, poID)
	if err != nil {
		log.Printf("[ERROR] ReceivingHandler.GetPurchaseOrderDetail: %v", err)
		if err.Error() == "purchase order not found" {
			ctx.JSON(http.StatusNotFound, models.APIError{Error: err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, detail)
}

func (h *ReceivingHandler) CheckProductInPO(ctx *gin.Context) {
	email := ctx.GetString("email")

	poIDStr := ctx.Query("po_id")
	barcode := ctx.Query("barcode")
	if poIDStr == "" || barcode == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "po_id and barcode are required"})
		return
	}
	poID, err := strconv.Atoi(poIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid po_id"})
		return
	}

	result, err := h.receivingService.CheckProductInPO(ctx.Request.Context(), email, poID, barcode)
	if err != nil {
		log.Printf("[ERROR] ReceivingHandler.CheckProductInPO: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

func (h *ReceivingHandler) ReceivePO(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.ReceivePORequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	err := h.receivingService.ReceivePO(ctx.Request.Context(), email, req)
	if err != nil {
		log.Printf("[ERROR] ReceivingHandler.ReceivePO: %v", err)
		errMsg := err.Error()
		if errMsg == "purchase order not found" || errMsg == "cannot receive for a different store" {
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: errMsg})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "PO items received successfully"})
}

func (h *ReceivingHandler) ReceiveLPR(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.ReceiveLPRRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	err := h.receivingService.ReceiveLPR(ctx.Request.Context(), email, req)
	if err != nil {
		log.Printf("[ERROR] ReceivingHandler.ReceiveLPR: %v", err)
		errMsg := err.Error()
		if errMsg == "LPR barcode not found in this PO" || errMsg == "LPR already received" ||
			errMsg == "purchase order not found" || errMsg == "cannot receive for a different store" {
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: errMsg})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "LPR received successfully"})
}

func (h *ReceivingHandler) GetStockTransfers(ctx *gin.Context) {
	email := ctx.GetString("email")

	results, err := h.receivingService.GetStockTransfers(ctx.Request.Context(), email)
	if err != nil {
		log.Printf("[ERROR] ReceivingHandler.GetStockTransfers: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"transfers": results})
}

func (h *ReceivingHandler) GetStockTransferDetail(ctx *gin.Context) {
	email := ctx.GetString("email")

	transferIDStr := ctx.Query("transfer_id")
	if transferIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "transfer_id is required"})
		return
	}
	transferID, err := strconv.Atoi(transferIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid transfer_id"})
		return
	}

	detail, err := h.receivingService.GetStockTransferDetail(ctx.Request.Context(), email, transferID)
	if err != nil {
		log.Printf("[ERROR] ReceivingHandler.GetStockTransferDetail: %v", err)
		if err.Error() == "transfer not found" {
			ctx.JSON(http.StatusNotFound, models.APIError{Error: err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, detail)
}

func (h *ReceivingHandler) ReceiveTransfer(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.ReceiveTransferRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	err := h.receivingService.ReceiveTransfer(ctx.Request.Context(), email, req)
	if err != nil {
		log.Printf("[ERROR] ReceivingHandler.ReceiveTransfer: %v", err)
		errMsg := err.Error()
		if errMsg == "transfer not found" || errMsg == "transfer is not in transit" {
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: errMsg})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Transfer items received successfully"})
}

func (h *ReceivingHandler) QuickReceiveTransfer(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.QuickReceiveTransferRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	err := h.receivingService.QuickReceiveTransfer(ctx.Request.Context(), email, req)
	if err != nil {
		log.Printf("[ERROR] ReceivingHandler.QuickReceiveTransfer: %v", err)
		errMsg := err.Error()
		if errMsg == "transfer not found" || errMsg == "transfer is not in transit" ||
			errMsg == "this transfer requires manual check — cannot quick receive" {
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: errMsg})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Transfer received successfully"})
}

func (h *ReceivingHandler) CheckProductInTransfer(ctx *gin.Context) {
	email := ctx.GetString("email")

	transferIDStr := ctx.Query("transfer_id")
	barcode := ctx.Query("barcode")
	if transferIDStr == "" || barcode == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "transfer_id and barcode are required"})
		return
	}
	transferID, err := strconv.Atoi(transferIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid transfer_id"})
		return
	}

	result, err := h.receivingService.CheckProductInTransfer(ctx.Request.Context(), email, transferID, barcode)
	if err != nil {
		log.Printf("[ERROR] ReceivingHandler.CheckProductInTransfer: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, result)
}
