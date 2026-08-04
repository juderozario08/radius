//radius-backend/internal/handler/online_order_handler.go
package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
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

	pageNumber, _ := strconv.Atoi(ctx.DefaultQuery("page_number", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "10"))

	orders, totalLength, err := h.onlineOrderService.GetAllOnlineOrders(ctx.Request.Context(), email, role, pageNumber, pageSize)
	if err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.GetAllOnlineOrders (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
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
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
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
