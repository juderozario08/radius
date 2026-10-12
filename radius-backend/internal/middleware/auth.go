package middleware

import (
	"log/slog"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/utils"

	"github.com/gin-gonic/gin"
)

func RequireAuth(authService *service.AuthService) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")
		if authHeader == "" {
			slog.WarnContext(ctx.Request.Context(), "RequireAuth: missing authorization header")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "An error occured while authorizing the user."})
			return
		}

		tokenString, ok := utils.ParseBearerToken(authHeader)
		if !ok {
			slog.WarnContext(ctx.Request.Context(), "RequireAuth: invalid authorization header format")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "invalid token format, expected 'Bearer <TOKEN>'"})
			return
		}

		auth, err := authService.Authenticate(ctx.Request.Context(), tokenString)
		if err != nil {
			slog.WarnContext(ctx.Request.Context(), "RequireAuth: authentication failed", "error", err)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: service.AuthErrorMessage(err)})
			return
		}

		ctx.Set("employee_id", auth.EmployeeId)
		ctx.Set("email", auth.Email)
		ctx.Set("role", string(auth.Role))
		ctx.Set("store_id", auth.StoreId)
		ctx.Set("token_string", tokenString)

		ctx.Next()
	}
}
