package handler

import (
	"net/http"
	"radius/internal/service"

	"github.com/gin-gonic/gin"
)

type SessionHandler struct {
	sessionService *service.SessionService
}

func NewSessionHandler(sessionService *service.SessionService) *SessionHandler {
	return &SessionHandler{
		sessionService: sessionService,
	}
}

func (h *SessionHandler) GetAllSessions(ctx *gin.Context) {
	sessionResponse, err := h.sessionService.GetAllSessions(ctx.Request.Context())
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, sessionResponse)
	return
}
