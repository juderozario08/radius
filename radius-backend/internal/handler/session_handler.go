// radius-backend/internal/handler/session_handler.go
package handler

import (
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/utils"

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
	pageNumber, pageSize := utils.ParsePagination(ctx)

	sessionResponse, err := h.sessionService.GetAllSessions(ctx.Request.Context(), pageNumber, pageSize)
	if err != nil {
		log.Printf("[ERROR] SessionHandler.GetAllSessions (Service): %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, sessionResponse)
}

func (h *SessionHandler) TerminateSession(ctx *gin.Context) {
	var body models.TerminateSessionRequest
	if err := ctx.ShouldBindJSON(&body); err != nil {
		log.Printf("[ERROR] SessionHandler.TerminateSession (BindJSON): %v", err)
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: err.Error()})
		return
	}
	sessionResponse, err := h.sessionService.TerminateSessionById(ctx.Request.Context(), body.SessionId)
	if err != nil {
		log.Printf("[ERROR] SessionHandler.TerminateSession (Service): %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, sessionResponse)
}
