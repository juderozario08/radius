//radius-backend/internal/handler/online_order_handler.go
package handler

import "radius/internal/service"

type OnlineOrderHandler struct {
	onlineOrderService *service.OnlineOrderService
}

func NewOnlineOrderHandler(onlineOrderService *service.OnlineOrderService) *OnlineOrderHandler {
	return &OnlineOrderHandler{
		onlineOrderService: onlineOrderService,
	}
}
