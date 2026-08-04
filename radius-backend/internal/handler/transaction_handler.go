// radius-backend/internal/handler/transaction_handler.go
package handler

import (
	"log"
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

func (h *TransactionHandler) GetAllTransactions(ctx *gin.Context) {
	email := ctx.GetString("email")
	role := models.EmployeeRole(ctx.GetString("role"))

	pageNumber, pageSize := utils.ParsePagination(ctx)

	transactions, totalLength, err := h.transactionService.GetAllTransactions(ctx.Request.Context(), email, role, pageNumber, pageSize)
	if err != nil {
		log.Printf("[ERROR] TransactionHandler.GetAllTransactions (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, models.GetAllTransactionsResponse{
		Transactions: transactions,
		TotalLength:  totalLength,
	})
}

func (h *TransactionHandler) GetTransactionByID(ctx *gin.Context) {
	email := ctx.GetString("email")
	role := models.EmployeeRole(ctx.GetString("role"))

	idStr := ctx.Query("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		log.Printf("[ERROR] TransactionHandler.GetTransactionByID (Atoi): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid transaction ID"})
		return
	}

	transaction, items, err := h.transactionService.GetTransactionByID(ctx.Request.Context(), email, role, id)
	if err != nil {
		log.Printf("[ERROR] TransactionHandler.GetTransactionByID (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	if transaction == nil {
		log.Printf("[ERROR] TransactionHandler.GetTransactionByID: Transaction not found")
		ctx.JSON(http.StatusNotFound, models.APIError{Error: "Transaction not found"})
		return
	}

	ctx.JSON(http.StatusOK, models.GetTransactionResponse{
		Transaction: transaction,
		Items:       items,
	})
}
