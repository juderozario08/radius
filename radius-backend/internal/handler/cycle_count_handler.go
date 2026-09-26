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

func (h *CycleCountHandler) GetWeeklyCycleCounts(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	var storeIDOverride *int
	if storeIDStr := ctx.Query("store_id"); storeIDStr != "" {
		if sid, err := strconv.Atoi(storeIDStr); err == nil {
			storeIDOverride = &sid
		}
	}

	counts, err := h.cycleCountService.GetWeeklyCycleCounts(ctx.Request.Context(), storeId, role, storeIDOverride)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.GetWeeklyCycleCounts: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, counts)
}

func (h *CycleCountHandler) GetCycleCountDetail(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	countIDStr := ctx.Param("id")
	if countIDStr == "" {
		countIDStr = ctx.Query("id")
	}
	if countIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "missing required query parameter: id"})
		return
	}

	countID, err := strconv.Atoi(countIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "invalid count id"})
		return
	}

	detail, err := h.cycleCountService.GetCycleCountDetail(ctx.Request.Context(), storeId, employeeId, role, countID)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.GetCycleCountDetail: %v", err)
		if strings.Contains(err.Error(), "currently assigned to") || strings.HasPrefix(err.Error(), "unauthorized") {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: err.Error()})
		} else if strings.Contains(err.Error(), "not found") {
			ctx.JSON(http.StatusNotFound, models.APIError{Error: err.Error()})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, detail)
}

func (h *CycleCountHandler) GetCycleCountItems(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	countIDStr := ctx.Param("id")
	if countIDStr == "" {
		countIDStr = ctx.Query("id")
	}
	if countIDStr == "" {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "missing required query parameter: id"})
		return
	}

	countID, err := strconv.Atoi(countIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "invalid count id"})
		return
	}

	items, err := h.cycleCountService.GetCycleCountItems(ctx.Request.Context(), storeId, employeeId, role, countID)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.GetCycleCountItems: %v", err)
		if strings.Contains(err.Error(), "currently assigned to") || strings.HasPrefix(err.Error(), "unauthorized") {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: err.Error()})
		} else if strings.Contains(err.Error(), "not found") {
			ctx.JSON(http.StatusNotFound, models.APIError{Error: err.Error()})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, items)
}

func (h *CycleCountHandler) StartCycleCount(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.StartCycleCountRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	count, err := h.cycleCountService.StartCount(ctx.Request.Context(), storeId, employeeId, role, req.CategoryId, req.StoreId)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.StartCycleCount: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, count)
}

func (h *CycleCountHandler) RecordScan(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.RecordScanRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	if idStr := ctx.Param("id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
			req.CountId = id
		}
	}

	item, err := h.cycleCountService.RecordScan(ctx.Request.Context(), storeId, employeeId, role, req)
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

func (h *CycleCountHandler) SubmitForApproval(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.SubmitCycleCountRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	if idStr := ctx.Param("id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
			req.CountId = id
		}
	}

	if err := h.cycleCountService.SubmitForApproval(ctx.Request.Context(), storeId, employeeId, role, req); err != nil {
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

func (h *CycleCountHandler) ApproveCycleCount(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.ApproveCycleCountRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	if idStr := ctx.Param("id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
			req.CountId = id
		}
	}

	if err := h.cycleCountService.ApproveCount(ctx.Request.Context(), storeId, employeeId, role, req); err != nil {
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

func (h *CycleCountHandler) TransferOwnership(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.TransferCycleCountOwnershipRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	if idStr := ctx.Param("id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
			req.CountId = id
		}
	}

	if err := h.cycleCountService.TransferOwnership(ctx.Request.Context(), storeId, role, req); err != nil {
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

func (h *CycleCountHandler) SearchCycleCounts(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	role := models.EmployeeRole(ctx.GetString("role"))

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
	if storeIDStr := ctx.Query("store_id"); storeIDStr != "" {
		if sid, err := strconv.Atoi(storeIDStr); err == nil {
			criteria.StoreId = &sid
		}
	}

	results, err := h.cycleCountService.SearchCycleCounts(ctx.Request.Context(), storeId, role, criteria)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.SearchCycleCounts: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, results)
}

func (h *CycleCountHandler) GetSchedule(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	role := models.EmployeeRole(ctx.GetString("role"))
	from := ctx.Query("from")
	to := ctx.Query("to")

	var storeIDOverride *int
	if storeIDStr := ctx.Query("store_id"); storeIDStr != "" {
		if sid, err := strconv.Atoi(storeIDStr); err == nil {
			storeIDOverride = &sid
		}
	}

	schedule, err := h.cycleCountService.GetSchedule(ctx.Request.Context(), storeId, role, from, to, storeIDOverride)
	if err != nil {
		log.Printf("[ERROR] CycleCountHandler.GetSchedule: %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, schedule)
}

func (h *CycleCountHandler) CreateScheduleEntry(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.CreateScheduleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	entry, err := h.cycleCountService.CreateScheduleEntry(ctx.Request.Context(), storeId, employeeId, role, req)
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
