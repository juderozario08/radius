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
		"id":         employee.EmployeeId,
		"store_id":   employee.StoreId,
		"first_name": employee.FirstName,
		"last_name":  employee.LastName,
		"role":       employee.Role,
	})
}

func (h *AuthHandler) Login(ctx *gin.Context) {
	var body models.EmployeeLoginRequest
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Println("Error binding JSON: " + err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employeeLoginResponse, err := h.authService.Login(ctx.Request.Context(), body, ctx.ClientIP())
	if err != nil {
		log.Println("Error logging in employee: " + err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusAccepted, employeeLoginResponse)
}

func (h *AuthHandler) Logout(ctx *gin.Context) {
	tokenString := ctx.MustGet("token_string").(string)
	err := h.authService.Logout(ctx.Request.Context(), tokenString)
	if err != nil {
		log.Println("Error logging out: " + err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusAccepted, gin.H{"message": "Successfully logged out"})
}
