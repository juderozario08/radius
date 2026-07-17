//radius-backend/internal/handler/fill_report_handler.go
package handler

import "radius/internal/service"

type FillReportHandler struct {
	fillReportService *service.FillReportService
}

func NewFillReportHandler(fillReportService *service.FillReportService) *FillReportHandler {
	return &FillReportHandler{
		fillReportService: fillReportService,
	}
}
