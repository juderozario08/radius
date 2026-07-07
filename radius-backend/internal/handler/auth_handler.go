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

	employeeRegisterResponse, err := h.authService.Register(ctx.Request.Context(), body)
	if err != nil {
		log.Println("Error registering employee: " + err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, employeeRegisterResponse)
}

func (h *AuthHandler) Login(ctx *gin.Context) {
	var body models.EmployeeLoginRequest
	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.authService.Login(ctx.Request.Context(), body, ctx.ClientIP())
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if result.RequiresConfirmation {
		ctx.JSON(http.StatusConflict, gin.H{
			"requires_confirmation": true,
			"error":                 "Already logged in on another device. Would you like to continue logging out of the previous session?",
		})
		return
	}

	ctx.JSON(http.StatusOK, result.Session)
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

func (h *AuthHandler) VerifyToken(ctx *gin.Context) {
	ctx.JSON(http.StatusAccepted, gin.H{"message": "Session verified"})
}
