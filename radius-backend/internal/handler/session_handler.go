package handler

import (
	"log/slog"
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
	tokenString := ctx.GetString("token_string")

	sessionResponse, err := h.sessionService.GetAllSessions(ctx.Request.Context(), pageNumber, pageSize, tokenString)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "SessionHandler.GetAllSessions: service error", "error", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, sessionResponse)
}

func (h *SessionHandler) TerminateSession(ctx *gin.Context) {
	sessionID, ok := pathID(ctx, "id")
	if !ok {
		ctx.JSON(http.StatusBadRequest, models.APIError{Error: "Request could not be completed"})
		return
	}

	sessionResponse, err := h.sessionService.TerminateSessionById(ctx.Request.Context(), sessionID)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "SessionHandler.TerminateSession: service error", "error", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "An internal error occurred"})
		return
	}

	ctx.JSON(http.StatusOK, sessionResponse)
}
