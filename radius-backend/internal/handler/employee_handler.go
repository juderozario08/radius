// radius-backend/internal/handler/employee_handler.go
package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

type EmployeeHandler struct {
	employeeService *service.EmployeeService
}

func NewEmployeeHandler(employeeService *service.EmployeeService) *EmployeeHandler {
	return &EmployeeHandler{
		employeeService: employeeService,
	}
}

func (e *EmployeeHandler) CreateEmployee(ctx *gin.Context) {
	var body models.CreateEmployeeRequest
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Printf("[ERROR] EmployeeHandler.CreateEmployee (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	createEmployeeResponse, err := e.employeeService.CreateEmployee(ctx.Request.Context(), body)
	if err != nil {
		log.Printf("[ERROR] EmployeeHandler.CreateEmployee (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusCreated, createEmployeeResponse)
}

func (e *EmployeeHandler) GetAllEmployees(ctx *gin.Context) {
	pageNumber, pageSize := utils.ParsePagination(ctx)

	var storeId *int
	if storeIdStr := ctx.Query("store_id"); storeIdStr != "" {
		if parsedStoreId, err := strconv.Atoi(storeIdStr); err == nil {
			storeId = &parsedStoreId
		}
	}

	employeeResponse, err := e.employeeService.GetAllEmployees(ctx.Request.Context(), pageNumber, pageSize, storeId)
	if err != nil {
		log.Printf("[ERROR] EmployeeHandler.GetAllEmployees (Service): %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, employeeResponse)
}

func (e *EmployeeHandler) GetManagerEmployees(ctx *gin.Context) {
	pageNumber, pageSize := utils.ParsePagination(ctx)

	email, exists := ctx.Get("email")
	if !exists {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Unauthorized"})
		return
	}

	employeeResponse, err := e.employeeService.GetManagerEmployees(ctx.Request.Context(), email.(string), pageNumber, pageSize)
	if err != nil {
		log.Printf("[ERROR] EmployeeHandler.GetManagerEmployees (Service): %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, employeeResponse)
}

func (e *EmployeeHandler) UpdateEmployee(ctx *gin.Context) {
	var body models.Employee
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Printf("[ERROR] EmployeeHandler.UpdateEmployee (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	updateEmployeeResponse, err := e.employeeService.UpdateEmployee(ctx.Request.Context(), body)
	if err != nil {
		log.Printf("[ERROR] EmployeeHandler.UpdateEmployee (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, updateEmployeeResponse)
}

func (e *EmployeeHandler) TerminateEmployee(ctx *gin.Context) {
	var body models.EmployeeIdRequest
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Printf("[ERROR] EmployeeHandler.TerminateEmployee (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	employeeResponse, err := e.employeeService.TerminateEmployee(ctx.Request.Context(), body.EmployeeId)
	if err != nil {
		log.Printf("[ERROR] EmployeeHandler.TerminateEmployee (Service): %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	ctx.JSON(http.StatusOK, employeeResponse)
}

func (e *EmployeeHandler) ActivateEmployee(ctx *gin.Context) {
	var body models.EmployeeIdRequest
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Printf("[ERROR] EmployeeHandler.ActivateEmployee (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	response, err := e.employeeService.ActivateEmployee(ctx.Request.Context(), body.EmployeeId)
	if err != nil {
		log.Printf("[ERROR] EmployeeHandler.ActivateEmployee (Service): %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}
	ctx.JSON(http.StatusOK, response)
}
