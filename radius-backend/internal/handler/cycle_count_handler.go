// radius-backend/internal/handler/cycle_count_handler.go
package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type CycleCountHandler struct {
	cycleCountService *service.CycleCountService
}

func NewCycleCountHandler(cycleCountService *service.CycleCountService) *CycleCountHandler {
	return &CycleCountHandler{
		cycleCountService: cycleCountService,
	}
}

// GetWeeklyCycleCounts handles GET /api/sales_floor/cycle_counts
func (h *CycleCountHandler) GetWeeklyCycleCounts(ctx *gin.Context) {
	email := ctx.GetString("email")

	counts, err := h.cycleCountService.GetWeeklyCycleCounts(ctx.Request.Context(), email)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.GetWeeklyCycleCounts: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, counts)
}

// GetCycleCountDetail handles GET /api/sales_floor/cycle_counts/detail
func (h *CycleCountHandler) GetCycleCountDetail(ctx *gin.Context) {
	email := ctx.GetString("email")
	countIDStr := ctx.Query("id")
	if countIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "missing required query parameter: id"})
		return
	}

	countID, err := strconv.Atoi(countIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "invalid count id"})
		return
	}

	detail, err := h.cycleCountService.GetCycleCountDetail(ctx.Request.Context(), email, countID)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.GetCycleCountDetail: %v", err)
		if strings.Contains(err.Error(), "currently assigned to") || strings.HasPrefix(err.Error(), "unauthorized") {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: err.Error()})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, detail)
}

// GetCycleCountItems handles GET /api/sales_floor/cycle_counts/items
func (h *CycleCountHandler) GetCycleCountItems(ctx *gin.Context) {
	email := ctx.GetString("email")
	countIDStr := ctx.Query("id")
	if countIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "missing required query parameter: id"})
		return
	}

	countID, err := strconv.Atoi(countIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "invalid count id"})
		return
	}

	items, err := h.cycleCountService.GetCycleCountItems(ctx.Request.Context(), email, countID)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.GetCycleCountItems: %v", err)
		if strings.Contains(err.Error(), "currently assigned to") || strings.HasPrefix(err.Error(), "unauthorized") {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: err.Error()})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, items)
}

// StartCycleCount handles POST /api/sales_floor/cycle_counts/start
func (h *CycleCountHandler) StartCycleCount(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.StartCycleCountRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	count, err := h.cycleCountService.StartCount(ctx.Request.Context(), email, req.CategoryId)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.StartCycleCount: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, count)
}

// RecordScan handles POST /api/sales_floor/cycle_counts/scan
func (h *CycleCountHandler) RecordScan(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.RecordScanRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	item, err := h.cycleCountService.RecordScan(ctx.Request.Context(), email, req)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.RecordScan: %v", err)
		if strings.Contains(err.Error(), "currently assigned to") || strings.HasPrefix(err.Error(), "unauthorized") {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: err.Error()})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, item)
}

// SubmitForApproval handles POST /api/sales_floor/cycle_counts/submit
func (h *CycleCountHandler) SubmitForApproval(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.SubmitCycleCountRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	if err := h.cycleCountService.SubmitForApproval(ctx.Request.Context(), email, req); err != nil {
		log.Printf("[ERROR] CycleCountHandler.SubmitForApproval: %v", err)
		if strings.Contains(err.Error(), "currently assigned to") || strings.HasPrefix(err.Error(), "unauthorized") {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: err.Error()})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Cycle count submitted for approval successfully"})
}

// ApproveCycleCount handles POST /api/sales_floor/cycle_counts/approve
func (h *CycleCountHandler) ApproveCycleCount(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.ApproveCycleCountRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	if err := h.cycleCountService.ApproveCount(ctx.Request.Context(), email, req); err != nil {
		log.Printf("[ERROR] CycleCountHandler.ApproveCycleCount: %v", err)
		if strings.HasPrefix(err.Error(), "unauthorized") {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: err.Error()})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Cycle count approved successfully and inventory reconciled"})
}

// TransferOwnership handles POST /api/sales_floor/cycle_counts/transfer
func (h *CycleCountHandler) TransferOwnership(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.TransferCycleCountOwnershipRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	if err := h.cycleCountService.TransferOwnership(ctx.Request.Context(), email, req); err != nil {
		log.Printf("[ERROR] CycleCountHandler.TransferOwnership: %v", err)
		if strings.HasPrefix(err.Error(), "unauthorized") {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: err.Error()})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Cycle count ownership transferred successfully"})
}

// SearchCycleCounts handles GET /api/sales_floor/cycle_counts/search
func (h *CycleCountHandler) SearchCycleCounts(ctx *gin.Context) {
	email := ctx.GetString("email")

	var criteria models.CycleCountSearchCriteria
	criteria.Query = ctx.Query("query")
	criteria.Status = ctx.Query("status")

	if catIDStr := ctx.Query("category_id"); catIDStr != "" {
		if catID, err := strconv.Atoi(catIDStr); err == nil {
			criteria.CategoryId = &catID
		}
	}
	if from := ctx.Query("date_from"); from != "" {
		criteria.DateFrom = &from
	}
	if to := ctx.Query("date_to"); to != "" {
		criteria.DateTo = &to
	}

	results, err := h.cycleCountService.SearchCycleCounts(ctx.Request.Context(), email, criteria)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.SearchCycleCounts: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, results)
}

// GetSchedule handles GET /api/sales_floor/cycle_counts/schedule
func (h *CycleCountHandler) GetSchedule(ctx *gin.Context) {
	email := ctx.GetString("email")
	from := ctx.Query("from")
	to := ctx.Query("to")

	schedule, err := h.cycleCountService.GetSchedule(ctx.Request.Context(), email, from, to)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.GetSchedule: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, schedule)
}

// CreateScheduleEntry handles POST /api/sales_floor/cycle_counts/schedule
func (h *CycleCountHandler) CreateScheduleEntry(ctx *gin.Context) {
	email := ctx.GetString("email")

	var req models.CreateScheduleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	entry, err := h.cycleCountService.CreateScheduleEntry(ctx.Request.Context(), email, req)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.CreateScheduleEntry: %v", err)
		if strings.HasPrefix(err.Error(), "unauthorized") {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: err.Error()})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusCreated, entry)
}
