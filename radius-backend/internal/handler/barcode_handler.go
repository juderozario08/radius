package handler

import "radius/internal/service"

type BarcodeHandler struct {
	barcodeService *service.BarcodeService
}

func NewBarcodeHandler(barcodeService *service.BarcodeService) *BarcodeHandler {
	return &BarcodeHandler{
		barcodeService: barcodeService,
	}
}
