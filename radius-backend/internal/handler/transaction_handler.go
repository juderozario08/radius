package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

type TransactionHandler struct {
	transactionService *service.TransactionService
}

func NewTransactionHandler(transactionService *service.TransactionService) *TransactionHandler {
	return &TransactionHandler{
		transactionService: transactionService,
	}
}

func (h *TransactionHandler) CreateTransaction(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.CreateTransactionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	createdTx, err := h.transactionService.CreateTransaction(ctx.Request.Context(), storeId, employeeId, role, req)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "TransactionHandler.CreateTransaction failed", "error", err)
		if errors.Is(err, service.ErrForbidden) {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: "Request could not be completed"})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Request could not be completed"})
		}
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"status":      "success",
		"message":     "Transaction created and reported to fill report",
		"transaction": createdTx,
	})
}

func (h *TransactionHandler) GetAllTransactions(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	pageNumber, pageSize := utils.ParsePagination(ctx)

	transactions, totalLength, err := h.transactionService.GetAllTransactions(ctx.Request.Context(), storeId, role, pageNumber, pageSize)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "TransactionHandler.GetAllTransactions: service error", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, models.GetAllTransactionsResponse{
		Transactions: transactions,
		TotalLength:  totalLength,
	})
}

func (h *TransactionHandler) GetTransactionByID(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	idStr := ctx.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "TransactionHandler.GetTransactionByID: invalid id", "error", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid transaction ID"})
		return
	}

	transaction, items, err := h.transactionService.GetTransactionByID(ctx.Request.Context(), storeId, role, id)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "TransactionHandler.GetTransactionByID: service error", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	if transaction == nil {
		slog.ErrorContext(ctx.Request.Context(), "TransactionHandler.GetTransactionByID: transaction not found")
		ctx.JSON(http.StatusNotFound, models.APIError{Error: "Transaction not found"})
		return
	}

	ctx.JSON(http.StatusOK, models.GetTransactionResponse{
		Transaction: transaction,
		Items:       items,
	})
}
