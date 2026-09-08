// radius-backend/internal/handler/online_order_handler.go
package handler

import (
	"fmt"
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/utils"
	"strconv"
	"strings"

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
		BillingPhone:      ctx.Query("billing_phone"),
		PaymentCard:       ctx.Query("payment_card"),
		SKU:               ctx.Query("sku"),
		Status:            ctx.Query("status"),
		DashboardOnly:     ctx.Query("dashboard_only") == "true",
	}

	if orderIdStr := ctx.Query("order_id"); orderIdStr != "" {
		if id, err := strconv.Atoi(orderIdStr); err == nil {
			criteria.OrderID = &id
		}
	}

	if assignedToStr := ctx.Query("assigned_to"); assignedToStr != "" {
		if aid, err := strconv.Atoi(assignedToStr); err == nil {
			criteria.AssignedTo = &aid
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

// CreateOnlineOrder handles POST /api/sales_floor/orders/online
func (h *OnlineOrderHandler) CreateOnlineOrder(ctx *gin.Context) {
	email := ctx.GetString("email")
	role := models.EmployeeRole(ctx.GetString("role"))

	var order models.OnlineOrder
	if err := ctx.ShouldBindJSON(&order); err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.CreateOnlineOrder (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid request payload: " + err.Error()})
		return
	}

	createdOrder, err := h.onlineOrderService.CreateOnlineOrder(ctx.Request.Context(), email, role, &order)
	if err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.CreateOnlineOrder (Service): %v", err)
		if strings.Contains(err.Error(), "invalid status") ||
			strings.Contains(err.Error(), "required") ||
			strings.Contains(err.Error(), "cannot be nil") {
			ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, createdOrder)
}

// AssignOnlineOrder handles PUT /api/sales_floor/orders/online/assign
func (h *OnlineOrderHandler) AssignOnlineOrder(ctx *gin.Context) {
	email := ctx.GetString("email")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.AssignOnlineOrderRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.AssignOnlineOrder (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid request payload: " + err.Error()})
		return
	}

	order, wasAssigned, err := h.onlineOrderService.AssignOnlineOrder(ctx.Request.Context(), email, role, req.OrderID, req.EmployeeID)
	if err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.AssignOnlineOrder (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to assign order: " + err.Error()})
		return
	}

	if !wasAssigned {
		assignee := "another associate"
		if order != nil && order.AssignedToName != nil && *order.AssignedToName != "" {
			assignee = *order.AssignedToName
		}
		ctx.JSON(http.StatusConflict, gin.H{
			"error":            fmt.Sprintf("Order #%d is already being worked on by %s", req.OrderID, assignee),
			"assigned_to":      order.AssignedTo,
			"assigned_to_name": order.AssignedToName,
			"online_order":     order,
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message":          fmt.Sprintf("Order #%d successfully assigned", req.OrderID),
		"online_order":     order,
		"assigned_to":      order.AssignedTo,
		"assigned_to_name": order.AssignedToName,
	})
}

// UpdateOnlineOrderItem handles PUT /api/sales_floor/orders/online/items
func (h *OnlineOrderHandler) UpdateOnlineOrderItem(ctx *gin.Context) {
	email := ctx.GetString("email")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.UpdateOnlineOrderItemRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.UpdateOnlineOrderItem (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid request payload: " + err.Error()})
		return
	}

	err := h.onlineOrderService.UpdateOrderItem(ctx.Request.Context(), email, role, req.OrderID, req.OrderItemID, req.PickedQty, req.Status, req.Reason)
	if err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.UpdateOnlineOrderItem (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to update item: " + err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "Order item updated successfully",
	})
}

// CompleteOrderPicking handles POST /api/sales_floor/orders/online/complete_pick
func (h *OnlineOrderHandler) CompleteOrderPicking(ctx *gin.Context) {
	email := ctx.GetString("email")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.CompletePickRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.CompleteOrderPicking (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid request payload: " + err.Error()})
		return
	}

	order, err := h.onlineOrderService.CompleteOrderPicking(ctx.Request.Context(), email, role, req.OrderID)
	if err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.CompleteOrderPicking (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to complete picking: " + err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message":      "Order picking completed successfully",
		"online_order": order,
	})
}

// CancelOnlineOrder handles POST /api/sales_floor/orders/online/cancel
func (h *OnlineOrderHandler) CancelOnlineOrder(ctx *gin.Context) {
	email := ctx.GetString("email")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.CancelOnlineOrderRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.CancelOnlineOrder (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Invalid request payload: " + err.Error()})
		return
	}

	order, err := h.onlineOrderService.CancelOnlineOrder(ctx.Request.Context(), email, role, req.OrderID, req.Reason)
	if err != nil {
		log.Printf("[ERROR] OnlineOrderHandler.CancelOnlineOrder (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to cancel order: " + err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message":      "Order cancelled successfully",
		"online_order": order,
	})
}



