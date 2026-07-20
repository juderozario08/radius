// radius-backend/internal/handler/employee_handler.go
package handler

import (
	"log"
	"net/http"
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
		log.Println("Error binding JSON: " + err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	createEmployeeResponse, err := e.employeeService.CreateEmployee(ctx.Request.Context(), body)
	if err != nil {
		log.Println("Error registering employee: " + err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, createEmployeeResponse)
}

func (e *EmployeeHandler) GetAllEmployees(ctx *gin.Context) {
	employeeResponse, err := e.employeeService.GetAllEmployees(ctx.Request.Context())
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, employeeResponse)
}

func (e *EmployeeHandler) UpdateEmployee(ctx *gin.Context) {
	var body models.Employee
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Println("Error binding JSON: " + err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateEmployeeResponse, err := e.employeeService.UpdateEmployee(ctx.Request.Context(), body)
	if err != nil {
		log.Println("Error updating employee: " + err.Error())
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
		log.Println("Error binding JSON: " + err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employeeResponse, err := e.employeeService.TerminateEmployee(ctx.Request.Context(), body.EmployeeId)
	if err != nil {
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
		log.Println("Error binding JSON: " + err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := e.employeeService.ActivateEmployee(ctx.Request.Context(), body.EmployeeId)
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, response)
}
