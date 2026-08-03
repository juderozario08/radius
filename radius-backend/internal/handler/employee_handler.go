// radius-backend/internal/handler/employee_handler.go
package handler

import (
	"log"
	"net/http"
	"strconv"
	"radius/internal/models"
	"radius/internal/service"

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
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	createEmployeeResponse, err := e.employeeService.CreateEmployee(ctx.Request.Context(), body)
	if err != nil {
		log.Printf("[ERROR] EmployeeHandler.CreateEmployee (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, createEmployeeResponse)
}

func (e *EmployeeHandler) GetAllEmployees(ctx *gin.Context) {
	pageNumberStr := ctx.DefaultQuery("page_number", "1")
	pageSizeStr := ctx.DefaultQuery("page_size", "10")

	pageNumber, err := strconv.Atoi(pageNumberStr)
	if err != nil || pageNumber < 1 {
		pageNumber = 1
	}
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 {
		pageSize = 10
	}

	var storeId *int
	if storeIdStr := ctx.Query("store_id"); storeIdStr != "" {
		if parsedStoreId, err := strconv.Atoi(storeIdStr); err == nil {
			storeId = &parsedStoreId
		}
	}

	employeeResponse, err := e.employeeService.GetAllEmployees(ctx.Request.Context(), pageNumber, pageSize, storeId)
	if err != nil {
		log.Printf("[ERROR] EmployeeHandler.GetAllEmployees (Service): %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, employeeResponse)
}

func (e *EmployeeHandler) GetManagerEmployees(ctx *gin.Context) {
	pageNumberStr := ctx.DefaultQuery("page_number", "1")
	pageSizeStr := ctx.DefaultQuery("page_size", "10")

	pageNumber, err := strconv.Atoi(pageNumberStr)
	if err != nil || pageNumber < 1 {
		pageNumber = 1
	}
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 {
		pageSize = 10
	}

	email, exists := ctx.Get("email")
	if !exists {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	employeeResponse, err := e.employeeService.GetManagerEmployees(ctx.Request.Context(), email.(string), pageNumber, pageSize)
	if err != nil {
		log.Printf("[ERROR] EmployeeHandler.GetManagerEmployees (Service): %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, employeeResponse)
}

func (e *EmployeeHandler) UpdateEmployee(ctx *gin.Context) {
	var body models.Employee
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Printf("[ERROR] EmployeeHandler.UpdateEmployee (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateEmployeeResponse, err := e.employeeService.UpdateEmployee(ctx.Request.Context(), body)
	if err != nil {
		log.Printf("[ERROR] EmployeeHandler.UpdateEmployee (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, updateEmployeeResponse)
}

func (e *EmployeeHandler) TerminateEmployee(ctx *gin.Context) {
	var body struct {
		EmployeeId int `json:"employee_id" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Printf("[ERROR] EmployeeHandler.TerminateEmployee (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employeeResponse, err := e.employeeService.TerminateEmployee(ctx.Request.Context(), body.EmployeeId)
	if err != nil {
		log.Printf("[ERROR] EmployeeHandler.TerminateEmployee (Service): %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, employeeResponse)
}

func (e *EmployeeHandler) ActivateEmployee(ctx *gin.Context) {
	var body struct {
		EmployeeId int `json:"employee_id" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Printf("[ERROR] EmployeeHandler.ActivateEmployee (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := e.employeeService.ActivateEmployee(ctx.Request.Context(), body.EmployeeId)
	if err != nil {
		log.Printf("[ERROR] EmployeeHandler.ActivateEmployee (Service): %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, response)
}
