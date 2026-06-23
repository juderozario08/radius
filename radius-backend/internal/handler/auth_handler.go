package handler

import (
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
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employee, err := h.authService.Register(ctx.Request.Context(), body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, employee)
}

func (h *AuthHandler) Login(ctx *gin.Context) {
}

func (h *AuthHandler) Logout(ctx *gin.Context) {
}
