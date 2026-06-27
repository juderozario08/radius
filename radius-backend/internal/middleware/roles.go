package middleware

import (
	"fmt"
	"net/http"
	"radius/internal/models"
	"slices"

	"github.com/gin-gonic/gin"
)

func RequireRole(allowedRoles ...models.EmployeeRole) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		userRole, exists := ctx.Get("role")
		fmt.Println(userRole)
		if !exists {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Role not found"})
			return
		}

		if !slices.Contains(allowedRoles, models.EmployeeRole(userRole.(string))) {
			ctx.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			return
		}

		ctx.Next()
	}
}
