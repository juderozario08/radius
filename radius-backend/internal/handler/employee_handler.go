// radius-backend/internal/handler/employee_handler.go
package handler

import (
	"log"
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

func (h *EmployeeHandler) DeleteEmployee(ctx *gin.Context) {
	var body struct {
		EmployeeId int `json:"employee_id" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Println("Error binding JSON: " + err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employeeResponse, err := h.employeeService.DeleteEmployee(ctx.Request.Context(), body.EmployeeId)
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, employeeResponse)
}
