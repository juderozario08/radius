//radius-backend/internal/handler/online_order_handler.go
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

type OnlineOrderHandler struct {
	onlineOrderService *service.OnlineOrderService
}

func NewOnlineOrderHandler(onlineOrderService *service.OnlineOrderService) *OnlineOrderHandler {
	return &OnlineOrderHandler{
		onlineOrderService: onlineOrderService,
	}
}

func (h *OnlineOrderHandler) GetAllOnlineOrders(ctx *gin.Context) {
	email := ctx.GetString("email")
	role := models.EmployeeRole(ctx.GetString("role"))

	pageNumber, pageSize := utils.ParsePagination(ctx)
	
	criteria := models.OrderSearchCriteria{
		OrderType:         ctx.Query("order_type"),
		CustomerFirstName: ctx.Query("customer_first_name"),
		CustomerLastName:  ctx.Query("customer_last_name"),
		CustomerEmail:     ctx.Query("customer_email"),
		BillingPhone:  ctx.Query("billing_phone"),
		PaymentCard:   ctx.Query("payment_card"),
		SKU:           ctx.Query("sku"),
		Status:        ctx.Query("status"),
	}
	
	if orderIdStr := ctx.Query("order_id"); orderIdStr != "" {
		if id, err := strconv.Atoi(orderIdStr); err == nil {
			criteria.OrderID = &id
		}
	}

	orders, totalLength, err := h.onlineOrderService.GetAllOnlineOrders(ctx.Request.Context(), email, role, pageNumber, pageSize, criteria)
	if err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.GetAllOnlineOrders (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, models.GetAllOnlineOrdersResponse{
		OnlineOrders: orders,
		TotalLength:  totalLength,
	})
}

func (h *OnlineOrderHandler) GetOnlineOrderByID(ctx *gin.Context) {
	email := ctx.GetString("email")
	role := models.EmployeeRole(ctx.GetString("role"))

	idStr := ctx.Query("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.GetOnlineOrderByID (Atoi): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid order ID"})
		return
	}

	order, items, err := h.onlineOrderService.GetOnlineOrderByID(ctx.Request.Context(), email, role, id)
	if err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.GetOnlineOrderByID (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	if order == nil {
		log.Printf("[ERROR] OnlineOrderHandler.GetOnlineOrderByID: Order not found")
		ctx.JSON(http.StatusNotFound, models.APIError{Error: "Order not found"})
		return
	}

	ctx.JSON(http.StatusOK, models.GetOnlineOrderResponse{
		OnlineOrder: order,
		Items:       items,
	})
}
