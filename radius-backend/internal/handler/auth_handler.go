package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(ctx *gin.Context) {
	var body models.CreateEmployeeRequest
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Println("Error binding JSON: " + err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employee, err := h.authService.Register(ctx.Request.Context(), body)
	if err != nil {
		log.Println("Error registering employee: " + err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"message":     "New employee created",
		"id":          employee.EmployeeId,
		"email":       employee.Email,
		"store_id":    employee.StoreId,
		"first_name":  employee.FirstName,
		"last_name":   employee.LastName,
		"role":        employee.Role,
		"phone":       employee.Phone,
		"address":     employee.Address,
		"city":        employee.City,
		"province":    employee.Province,
		"postal_code": employee.PostalCode,
		"is_active":   employee.IsActive,
	})
}

func (h *AuthHandler) Login(ctx *gin.Context) {
	var body models.EmployeeLoginRequest
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Println("Error binding JSON: " + err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employee, token, err := h.authService.Login(ctx.Request.Context(), body)
	if err != nil {
		log.Println("Error logging in employee: " + err.Error())
		return
	}

	ctx.JSON(http.StatusAccepted, models.EmployeeLoginResponse{
		Token:      token,
		EmployeeId: employee.EmployeeId,
		LastName:   employee.LastName,
		Role:       employee.Role,
		StoreId:    employee.StoreId,
	})
}

func (h *AuthHandler) Logout(ctx *gin.Context) {
}
