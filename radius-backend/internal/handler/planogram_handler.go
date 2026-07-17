//radius-backend/internal/handler/planogram_handler.go
package handler

import "radius/internal/service"

type PlanogramHandler struct {
	planogramService *service.PlanogramService
}

func NewPlanogramHandler(planogramService *service.PlanogramService) *PlanogramHandler {
	return &PlanogramHandler{
		planogramService: planogramService,
	}
}
