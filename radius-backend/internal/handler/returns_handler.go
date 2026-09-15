package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ReturnsHandler struct {
	returnsService *service.ReturnsService
}

func NewReturnsHandler(returnsService *service.ReturnsService) *ReturnsHandler {
	return &ReturnsHandler{
		returnsService: returnsService,
	}
}

func (h *ReturnsHandler) CreateReturn(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.CreateReturnRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	createdReturn, err := h.returnsService.CreateReturn(ctx.Request.Context(), email, req)
	if err != nil {
		log.Printf("[ERROR] ReturnsHandler.CreateReturn: %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, createdReturn)
}

func (h *ReturnsHandler) GetReturns(ctx *gin.Context) {
	email := ctx.GetString("email")

	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "15"))

	var criteria models.ReturnSearchCriteria
	if statusStr := ctx.Query("status"); statusStr != "" {
		st := models.ReturnStatus(statusStr)
		criteria.Status = &st
	}
	if storeIDStr := ctx.Query("store_id"); storeIDStr != "" {
		if id, err := strconv.Atoi(storeIDStr); err == nil && id > 0 {
			criteria.StoreId = &id
		}
	}
	if dateFrom := ctx.Query("date_from"); dateFrom != "" {
		criteria.DateFrom = &dateFrom
	}
	if dateTo := ctx.Query("date_to"); dateTo != "" {
		criteria.DateTo = &dateTo
	}
	if q := ctx.Query("query"); q != "" {
		criteria.Query = &q
	}

	results, total, err := h.returnsService.GetReturns(ctx.Request.Context(), email, criteria, page, limit)
	if err != nil {
		log.Printf("[ERROR] ReturnsHandler.GetReturns: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to retrieve returns"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"returns":      results,
		"total_length": total,
	})
}

func (h *ReturnsHandler) GetReturnDetail(ctx *gin.Context) {
	email := ctx.GetString("email")

	returnIDStr := ctx.Param("id")
	if returnIDStr == "" {
		returnIDStr = ctx.Query("return_id")
	}
	if returnIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "return_id is required"})
		return
	}

	returnID, err := strconv.Atoi(returnIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid return_id"})
		return
	}

	detail, err := h.returnsService.GetReturnDetail(ctx.Request.Context(), email, returnID)
	if err != nil {
		log.Printf("[ERROR] ReturnsHandler.GetReturnDetail: %v", err)
		if err.Error() == "return not found" {
			ctx.JSON(http.StatusNotFound, models.APIError{Error: err.Error()})
			return
		}
		if err.Error() == "unauthorized to view return for another store" {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to retrieve return detail"})
		return
	}

	ctx.JSON(http.StatusOK, detail)
}

func (h *ReturnsHandler) ApproveReturn(ctx *gin.Context) {
	email := ctx.GetString("email")

	returnIDStr := ctx.Param("id")
	if returnIDStr == "" {
		returnIDStr = ctx.Query("return_id")
	}
	if returnIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "return_id is required"})
		return
	}

	returnID, err := strconv.Atoi(returnIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid return_id"})
		return
	}

	if err := h.returnsService.ApproveReturn(ctx.Request.Context(), email, returnID); err != nil {
		log.Printf("[ERROR] ReturnsHandler.ApproveReturn: %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, models.APIMessage{Message: "Return approved successfully"})
}

func (h *ReturnsHandler) RejectReturn(ctx *gin.Context) {
	email := ctx.GetString("email")

	returnIDStr := ctx.Param("id")
	if returnIDStr == "" {
		returnIDStr = ctx.Query("return_id")
	}
	if returnIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "return_id is required"})
		return
	}

	returnID, err := strconv.Atoi(returnIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid return_id"})
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	_ = ctx.ShouldBindJSON(&req)

	if err := h.returnsService.RejectReturn(ctx.Request.Context(), email, returnID, req.Reason); err != nil {
		log.Printf("[ERROR] ReturnsHandler.RejectReturn: %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, models.APIMessage{Message: "Return rejected successfully"})
}

func (h *ReturnsHandler) LookupTransaction(ctx *gin.Context) {
	email := ctx.GetString("email")

	txIDStr := ctx.Param("id")
	if txIDStr == "" {
		txIDStr = ctx.Query("transaction_id")
	}
	if txIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "transaction_id is required"})
		return
	}

	txID, err := strconv.ParseInt(txIDStr, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid transaction_id"})
		return
	}

	resp, err := h.returnsService.LookupTransaction(ctx.Request.Context(), email, txID)
	if err != nil {
		log.Printf("[ERROR] ReturnsHandler.LookupTransaction: %v", err)
		if err.Error() == "transaction not found" {
			ctx.JSON(http.StatusNotFound, models.APIError{Error: err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to lookup transaction"})
		return
	}

	ctx.JSON(http.StatusOK, resp)
}

func (h *ReturnsHandler) LookupByProduct(ctx *gin.Context) {
	email := ctx.GetString("email")

	barcode := ctx.Query("barcode")
	if barcode == "" {
		barcode = ctx.Query("upc")
	}
	if barcode == "" {
		barcode = ctx.Query("sku")
	}
	if barcode == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "barcode, upc, or sku query param is required"})
		return
	}

	results, err := h.returnsService.LookupTransactionsByProduct(ctx.Request.Context(), email, barcode)
	if err != nil {
		log.Printf("[ERROR] ReturnsHandler.LookupByProduct: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to search transactions by product"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"transactions": results,
	})
}

func (h *ReturnsHandler) GetRtvQueue(ctx *gin.Context) {
	email := ctx.GetString("email")

	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "20"))

	var status *models.RtvStatus
	if st := ctx.Query("status"); st != "" {
		rtvSt := models.RtvStatus(st)
		status = &rtvSt
	}

	results, total, err := h.returnsService.GetRtvQueue(ctx.Request.Context(), email, status, page, limit)
	if err != nil {
		log.Printf("[ERROR] ReturnsHandler.GetRtvQueue: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to retrieve RTV queue"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"rtv_queue":    results,
		"total_length": total,
	})
}

