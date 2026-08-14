package handler

import (
	"net/http"
	"radius/internal/service"
	"strconv"
	"github.com/gin-gonic/gin"
)

type FillReportHandler struct {
	service *service.FillReportService
}

func NewFillReportHandler(s *service.FillReportService) *FillReportHandler {
	return &FillReportHandler{service: s}
}

func (h *FillReportHandler) GetFillReport(c *gin.Context) {
	storeID, _ := strconv.Atoi(c.Param("store_id"))
	// Call service using storeID
	c.JSON(http.StatusOK, gin.H{"status": "success", "store_id": storeID, "data": "mock fill report data"})
}

func (h *FillReportHandler) ScanEmptyHole(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Empty hole logged!"})
}
