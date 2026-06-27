package handler

import "radius/internal/service"

type POSHandler struct {
	posService *service.POSService
}

func NewPOSHandler(
	posService *service.POSService,
) *POSHandler {
	return &POSHandler{
		posService: posService,
	}
}
