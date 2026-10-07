package handler

import (
	"errors"
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

func (h *PrintOrderHandler) UpdateStatus(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil || id <= 0 {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid order ID"})
		return
	}
	var body struct {
		Status models.PrintOrderStatus `json:"status" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Status is required"})
		return
	}
	order, err := h.printOrderService.UpdateStatus(ctx.Request.Context(), id, ctx.GetInt("store_id"), models.EmployeeRole(ctx.GetString("role")), body.Status)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrForbidden):
			ctx.JSON(http.StatusForbidden, models.APIError{Error: "Forbidden"})
		case errors.Is(err, service.ErrNotFound):
			ctx.JSON(http.StatusNotFound, models.APIError{Error: "Order not found"})
		case errors.Is(err, service.ErrConflict):
			ctx.JSON(http.StatusConflict, models.APIError{Error: "Invalid or stale status transition"})
		default:
			log.Printf("[ERROR] PrintOrderHandler.UpdateStatus: %v", err)
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		}
		return
	}
	ctx.JSON(http.StatusOK, order)
}

func NewPrintOrderHandler(printOrderService *service.PrintOrderService) *PrintOrderHandler {
	return &PrintOrderHandler{
		printOrderService: printOrderService,
	}
}

func (h *PrintOrderHandler) GetAllPrintOrders(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
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

	orders, totalLength, err := h.printOrderService.GetAllPrintOrders(ctx.Request.Context(), storeId, role, pageNumber, pageSize, criteria)
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
	idStr := ctx.Param("id")
	if idStr == "" {
		idStr = ctx.Query("id")
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		log.Printf("[ERROR] PrintOrderHandler.GetPrintOrderByID (Atoi): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid order ID"})
		return
	}

	order, items, err := h.printOrderService.GetPrintOrderByIDForStore(ctx.Request.Context(), id, ctx.GetInt("store_id"), models.EmployeeRole(ctx.GetString("role")))
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
