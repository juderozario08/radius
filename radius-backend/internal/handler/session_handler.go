// radius-backend/internal/handler/session_handler.go
package handler

import (
	"log"
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
}

func (h *SessionHandler) GetSession(ctx *gin.Context) {
	sessionResponse, err := h.sessionService.GetAllSessions(ctx.Request.Context())
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, sessionResponse)
}

func (h *SessionHandler) TerminateSession(ctx *gin.Context) {
	var body struct {
		SessionId int `json:"session_id" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Println("Error binding JSON: " + err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sessionResponse, err := h.sessionService.TerminateSessionById(ctx.Request.Context(), body.SessionId)
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, sessionResponse)
}
