package handler

import (
	"radius/internal/api"

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

func (h *FillReportHandler) resolveStoreID(c *gin.Context) (int, error) {
	if storeParam := c.Query("store_id"); storeParam != "" {
		if parsed, err := strconv.Atoi(storeParam); err == nil && parsed > 0 {
			return parsed, nil
		}
	}
	if storeID := c.GetInt("store_id"); storeID > 0 {
		return storeID, nil
	}
	return 0, http.ErrNoCookie
}

func (h *FillReportHandler) GetFillReport(c *gin.Context) {
	storeID, err := h.resolveStoreID(c)
	if err != nil || storeID <= 0 {
		api.Error(c, http.StatusBadRequest, "Invalid or missing store ID")
		return
	}

	var filter models.FillReportFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		api.ErrorWithDetails(c, http.StatusBadRequest, "Invalid query parameters", err.Error())
		return
	}

	resp, err := h.service.GetStoreFillReport(c.Request.Context(), storeID, filter)
	if err != nil {
		log.Printf("Error getting fill report for store %d: %v", storeID, err)
		api.ErrorWithDetails(c, http.StatusInternalServerError, "Failed to retrieve fill report", err.Error())
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *FillReportHandler) ScanEmptyHole(c *gin.Context) {
	storeID, err := h.resolveStoreID(c)
	if err != nil || storeID <= 0 {
		api.Error(c, http.StatusBadRequest, "Invalid or missing store ID")
		return
	}

	var req models.ScanEmptyHoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		api.ErrorWithDetails(c, http.StatusBadRequest, "Invalid request payload", err.Error())
		return
	}

	var empID *int
	if eid := c.GetInt("employee_id"); eid > 0 {
		empID = &eid
	}

	if err := h.service.LogEmptyHole(c.Request.Context(), storeID, req.ProductID, empID); err != nil {
		log.Printf("Error logging empty hole: %v", err)
		api.ErrorWithDetails(c, http.StatusInternalServerError, "Failed to log empty hole", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Empty hole logged to fill report"})
}

func (h *FillReportHandler) GetIS4TCSession(c *gin.Context) {
	storeID, err := h.resolveStoreID(c)
	if err != nil || storeID <= 0 {
		api.Error(c, http.StatusBadRequest, "Invalid or missing store ID")
		return
	}

	items, err := h.service.GetActiveIS4TCSession(c.Request.Context(), storeID)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to retrieve session")
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "items": items})
}

func (h *FillReportHandler) AddToIS4TCSession(c *gin.Context) {
	storeID, err := h.resolveStoreID(c)
	if err != nil || storeID <= 0 {
		api.Error(c, http.StatusBadRequest, "Invalid or missing store ID")
		return
	}

	var req struct {
		Product models.MimsProductInventory `json:"product"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Bind error in AddToIS4TCSession: %v", err)
		api.ErrorWithDetails(c, http.StatusBadRequest, "Invalid payload", err.Error())
		return
	}

	var empID *int
	if eid := c.GetInt("employee_id"); eid > 0 {
		empID = &eid
	}

	items, err := h.service.AddToIS4TCSession(c.Request.Context(), storeID, req.Product, empID)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to add to session")
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "items": items})
}

func (h *FillReportHandler) ClearIS4TCSession(c *gin.Context) {
	storeID, err := h.resolveStoreID(c)
	if err != nil || storeID <= 0 {
		api.Error(c, http.StatusBadRequest, "Invalid or missing store ID")
		return
	}

	err = h.service.ClearIS4TCSession(c.Request.Context(), storeID)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to clear session")
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Session cleared"})
}
