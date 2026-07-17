//radius-backend/internal/handler/transfer_handler.go
package handler

import "radius/internal/service"

type TransferHandler struct {
	transferService *service.TransferService
}

func NewTransferHandler(transferService *service.TransferService) *TransferHandler {
	return &TransferHandler{
		transferService: transferService,
	}
}
