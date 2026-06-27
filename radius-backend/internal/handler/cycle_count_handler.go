package handler

import "radius/internal/service"

type CycleCountHandler struct {
	cycleCountService *service.CycleCountService
}

func NewCycleCountHandler(cycleCountService *service.CycleCountService) *CycleCountHandler {
	return &CycleCountHandler{
		cycleCountService: cycleCountService,
	}
}
