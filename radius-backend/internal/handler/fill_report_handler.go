package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
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

func (h *FillReportHandler) GetIS4TCSession(c *gin.Context) {
	storeID := c.GetInt("store_id")
	items, err := h.service.GetActiveIS4TCSession(c.Request.Context(), storeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve session"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "items": items})
}

func (h *FillReportHandler) AddToIS4TCSession(c *gin.Context) {
	storeID := c.GetInt("store_id")
	var req struct {
		Product models.MimsProductInventory `json:"product"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Bind error in AddToIS4TCSession: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload", "details": err.Error()})
		return
	}

	items, err := h.service.AddToIS4TCSession(c.Request.Context(), storeID, req.Product)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to session"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "items": items})
}

func (h *FillReportHandler) ClearIS4TCSession(c *gin.Context) {
	storeID := c.GetInt("store_id")
	err := h.service.ClearIS4TCSession(c.Request.Context(), storeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear session"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Session cleared"})
}
