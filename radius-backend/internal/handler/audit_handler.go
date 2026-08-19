package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type AuditHandler struct {
	auditService *service.AuditService
}

func NewAuditHandler(auditService *service.AuditService) *AuditHandler {
	return &AuditHandler{auditService: auditService}
}

func (h *AuditHandler) GetProductAuditTrail(c *gin.Context) {
	email, exists := c.Get("email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	barcode := c.Query("barcode")
	if barcode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "barcode query parameter is required"})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offsetStr := c.DefaultQuery("offset", "0")
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// Parse filters
	var filter models.AuditFilter
	if startStr := c.Query("start_date"); startStr != "" {
		if t, err := time.Parse(time.RFC3339, startStr); err == nil {
			filter.StartDate = &t
		}
	}
	if endStr := c.Query("end_date"); endStr != "" {
		if t, err := time.Parse(time.RFC3339, endStr); err == nil {
			filter.EndDate = &t
		}
	}
	if txnType := c.Query("transaction_type"); txnType != "" {
		filter.TransactionType = &txnType
	}
	if empIdStr := c.Query("employee_id"); empIdStr != "" {
		if empId, err := strconv.Atoi(empIdStr); err == nil {
			filter.EmployeeId = &empId
		}
	}
	if storeIdStr := c.Query("store_id"); storeIdStr != "" {
		if storeId, err := strconv.Atoi(storeIdStr); err == nil {
			filter.StoreId = &storeId
		}
	}
	sortOrder := c.DefaultQuery("sort_order", "DESC")
	filter.SortOrder = sortOrder

	res, err := h.auditService.GetProductAuditTrail(c.Request.Context(), email.(string), barcode, filter, limit, offset)
	if err != nil {
		log.Printf("[ERROR] AuditHandler.GetProductAuditTrail: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, res)
}
