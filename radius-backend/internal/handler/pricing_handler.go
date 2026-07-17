//radius-backend/internal/handler/pricing_handler.go
package handler

import "radius/internal/service"

type PricingHandler struct {
	pricingService *service.PricingService
}

func NewPricingHandler(pricingService *service.PricingService) *PricingHandler {
	return &PricingHandler{
		pricingService: pricingService,
	}
}
