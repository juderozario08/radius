// radius-backend/internal/handler/print_order_handler.go
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

type PrintOrderHandler struct {
	printOrderService *service.PrintOrderService
}

func NewPrintOrderHandler(printOrderService *service.PrintOrderService) *PrintOrderHandler {
	return &PrintOrderHandler{
		printOrderService: printOrderService,
	}
}

func (h *PrintOrderHandler) GetAllPrintOrders(ctx *gin.Context) {
	email := ctx.GetString("email")
	role := models.EmployeeRole(ctx.GetString("role"))

	pageNumber, pageSize := utils.ParsePagination(ctx)

	criteria := models.PrintOrderSearchCriteria{
		OrderType:     ctx.Query("order_type"),
		CustomerName:  ctx.Query("customer_name"),
		CustomerEmail: ctx.Query("customer_email"),
		CustomerPhone: ctx.Query("customer_phone"),
		Status:        ctx.Query("status"),
	}

	if orderIdStr := ctx.Query("order_id"); orderIdStr != "" {
		if id, err := strconv.Atoi(orderIdStr); err == nil {
			criteria.OrderID = &id
		}
	}

	orders, totalLength, err := h.printOrderService.GetAllPrintOrders(ctx.Request.Context(), email, role, pageNumber, pageSize, criteria)
	if err != nil {
		log.Printf("[ERROR] PrintOrderHandler.GetAllPrintOrders (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, models.GetAllPrintOrdersResponse{
		PrintOrders: orders,
		TotalLength: totalLength,
	})
}

func (h *PrintOrderHandler) GetPrintOrderByID(ctx *gin.Context) {
	email := ctx.GetString("email")
	role := models.EmployeeRole(ctx.GetString("role"))

	idStr := ctx.Query("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		log.Printf("[ERROR] PrintOrderHandler.GetPrintOrderByID (Atoi): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid order ID"})
		return
	}

	order, items, err := h.printOrderService.GetPrintOrderByID(ctx.Request.Context(), email, role, id)
	if err != nil {
		log.Printf("[ERROR] PrintOrderHandler.GetPrintOrderByID (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	if order == nil {
		log.Printf("[ERROR] PrintOrderHandler.GetPrintOrderByID: Order not found")
		ctx.JSON(http.StatusNotFound, models.APIError{Error: "Order not found"})
		return
	}

	ctx.JSON(http.StatusOK, models.GetPrintOrderResponse{
		PrintOrder: order,
		Items:      items,
	})
}
