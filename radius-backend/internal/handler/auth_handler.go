// radius-backend/internal/handler/auth_handler.go
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

func (h *AuthHandler) Login(ctx *gin.Context) {
	var body models.EmployeeLoginRequest
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Printf("[ERROR] AuthHandler.Login (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}

	result, err := h.authService.Login(ctx.Request.Context(), body, ctx.ClientIP())
	if err != nil {
		log.Printf("[ERROR] AuthHandler.Login (Service): %v", err)
		ctx.JSON(http.StatusUnauthorized, models.APIError{Error: err.Error()})
		return
	}

	if result.RequiresConfirmation {
		ctx.JSON(http.StatusConflict, models.LoginConflictResponse{
			RequiresConfirmation: true,
			Error:                "Already logged in on another device. Would you like to continue logging out of the previous session?",
		})
		return
	}

	ctx.JSON(http.StatusOK, result.Session)
}

func (h *AuthHandler) Logout(ctx *gin.Context) {
	tokenString, exists := ctx.Get("token_string")
	if !exists {
		log.Printf("[ERROR] AuthHandler.Logout: token_string not found in context")
		ctx.JSON(http.StatusUnauthorized, models.APIError{Error: "Unauthorized"})
		return
	}
	err := h.authService.Logout(ctx.Request.Context(), tokenString.(string))
	if err != nil {
		log.Printf("[ERROR] AuthHandler.Logout (Service): %v", err)
		ctx.JSON(http.StatusInternalServerError, models.APIError{Error: "Failed to logout"})
		return
	}

	ctx.JSON(http.StatusOK, models.APIMessage{Message: "Successfully logged out"})
}

func (h *AuthHandler) VerifyToken(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, models.APIMessage{Message: "Session verified"})
}

func (h *AuthHandler) RefreshToken(ctx *gin.Context) {
	var body models.RefreshTokenRequest
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Printf("[ERROR] AuthHandler.RefreshToken (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "refresh_token is required"})
		return
	}

	result, err := h.authService.RefreshToken(ctx.Request.Context(), body.RefreshToken)
	if err != nil {
		log.Printf("[ERROR] AuthHandler.RefreshToken (Service): %v", err)
		ctx.JSON(http.StatusUnauthorized, models.APIError{Error: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, result)
}
