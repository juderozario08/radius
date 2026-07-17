//radius-backend/internal/handler/employee_handler.go
package handler

import (
	"net/http"
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

func (h *EmployeeHandler) GetAllEmployees(ctx *gin.Context) {
	employeeResponse, err := h.employeeService.GetAllEmployees(ctx.Request.Context())
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, employeeResponse)
}

// TODO:
func (h *EmployeeHandler) GetEmployee(ctx *gin.Context) {
	sessionResponse, err := h.employeeService.GetAllEmployees(ctx.Request.Context())
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, sessionResponse)
}

// TODO:
func (h *EmployeeHandler) DeleteEmployee(ctx *gin.Context) {
	sessionResponse, err := h.employeeService.GetAllEmployees(ctx.Request.Context())
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, sessionResponse)
}
