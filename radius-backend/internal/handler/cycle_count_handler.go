package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"radius/internal/api"
	"radius/internal/models"
	"radius/internal/service"
	"strconv"

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
		slog.ErrorContext(ctx.Request.Context(), "CycleCountHandler.GetWeeklyCycleCounts failed", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Request could not be completed"})
		return
	}

	ctx.JSON(http.StatusOK, counts)
}

func (h *CycleCountHandler) GetCycleCountDetail(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	countIDStr := ctx.Param("id")

	countID, err := strconv.Atoi(countIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "invalid count id"})
		return
	}

	detail, err := h.cycleCountService.GetCycleCountDetail(ctx.Request.Context(), storeId, employeeId, role, countID)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "CycleCountHandler.GetCycleCountDetail failed", "error", err)
		if errors.Is(err, service.ErrForbidden) {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: "Request could not be completed"})
		} else if errors.Is(err, service.ErrNotFound) {
			ctx.JSON(http.StatusNotFound, models.APIError{Error: "Request could not be completed"})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Request could not be completed"})
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

	countID, err := strconv.Atoi(countIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "invalid count id"})
		return
	}

	items, err := h.cycleCountService.GetCycleCountItems(ctx.Request.Context(), storeId, employeeId, role, countID)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "CycleCountHandler.GetCycleCountItems failed", "error", err)
		if errors.Is(err, service.ErrForbidden) {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: "Request could not be completed"})
		} else if errors.Is(err, service.ErrNotFound) {
			ctx.JSON(http.StatusNotFound, models.APIError{Error: "Request could not be completed"})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Request could not be completed"})
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
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	count, err := h.cycleCountService.StartCount(ctx.Request.Context(), storeId, employeeId, role, req.CategoryId, req.StoreId)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "CycleCountHandler.StartCycleCount failed", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Request could not be completed"})
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
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	id, ok := pathID(ctx, "id")
	if !ok {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}
	req.CountId = id

	item, err := h.cycleCountService.RecordScan(ctx.Request.Context(), storeId, employeeId, role, req)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "CycleCountHandler.RecordScan failed", "error", err)
		if errors.Is(err, service.ErrForbidden) {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: "Request could not be completed"})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Request could not be completed"})
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
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	id, ok := pathID(ctx, "id")
	if !ok {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}
	req.CountId = id

	if err := h.cycleCountService.SubmitForApproval(ctx.Request.Context(), storeId, employeeId, role, req); err != nil {
		slog.ErrorContext(ctx.Request.Context(), "CycleCountHandler.SubmitForApproval failed", "error", err)
		if errors.Is(err, service.ErrForbidden) {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: "Request could not be completed"})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Request could not be completed"})
		}
		return
	}

	api.Message(ctx, http.StatusOK, "Cycle count submitted for approval successfully")
}

func (h *CycleCountHandler) ApproveCycleCount(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	employeeId := ctx.GetInt("employee_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	id, ok := pathID(ctx, "id")
	if !ok {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	if err := h.cycleCountService.ApproveCount(ctx.Request.Context(), storeId, employeeId, role, models.ApproveCycleCountRequest{CountId: id}); err != nil {
		slog.ErrorContext(ctx.Request.Context(), "CycleCountHandler.ApproveCycleCount failed", "error", err)
		if errors.Is(err, service.ErrForbidden) {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: "Request could not be completed"})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Request could not be completed"})
		}
		return
	}

	api.Message(ctx, http.StatusOK, "Cycle count approved successfully and inventory reconciled")
}

func (h *CycleCountHandler) TransferOwnership(ctx *gin.Context) {
	storeId := ctx.GetInt("store_id")
	role := models.EmployeeRole(ctx.GetString("role"))

	var req models.TransferCycleCountOwnershipRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	id, ok := pathID(ctx, "id")
	if !ok {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}
	req.CountId = id

	if err := h.cycleCountService.TransferOwnership(ctx.Request.Context(), storeId, role, req); err != nil {
		slog.ErrorContext(ctx.Request.Context(), "CycleCountHandler.TransferOwnership failed", "error", err)
		if errors.Is(err, service.ErrForbidden) {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: "Request could not be completed"})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Request could not be completed"})
		}
		return
	}

	api.Message(ctx, http.StatusOK, "Cycle count ownership transferred successfully")
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
		slog.ErrorContext(ctx.Request.Context(), "CycleCountHandler.SearchCycleCounts failed", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Request could not be completed"})
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
		slog.ErrorContext(ctx.Request.Context(), "CycleCountHandler.GetSchedule failed", "error", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Request could not be completed"})
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
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	entry, err := h.cycleCountService.CreateScheduleEntry(ctx.Request.Context(), storeId, employeeId, role, req)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "CycleCountHandler.CreateScheduleEntry failed", "error", err)
		if errors.Is(err, service.ErrForbidden) {
			ctx.JSON(http.StatusForbidden, models.APIError{Error: "Request could not be completed"})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Request could not be completed"})
		}
		return
	}

	ctx.JSON(http.StatusCreated, entry)
}
