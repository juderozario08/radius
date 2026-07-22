// radius-backend/internal/middleware/roles.go
package middleware

import (
	"net/http"
	"radius/internal/models"
	"slices"

	"github.com/gin-gonic/gin"
)

type Permission string

const (
	PermViewSalesFloorAction Permission = "view_sales_floor"
	PermViewBackRoomActions  Permission = "view_back_room"
	PermViewServiceActions   Permission = "view_service_actions"
	PermViewManagerActions   Permission = "view_manager_actions" // Fixed string value
	PermViewAdminActions     Permission = "view_admin_actions"
)

var rolePermissions = map[models.EmployeeRole][]Permission{
	"SALES": {
		PermViewSalesFloorAction,
		PermViewBackRoomActions,
	},
	"SERVICE": {
		PermViewSalesFloorAction,
		PermViewBackRoomActions,
		PermViewServiceActions,
	},
	"MANAGER": {
		PermViewSalesFloorAction,
		PermViewBackRoomActions,
		PermViewServiceActions,
		PermViewManagerActions,
	},
	"ADMIN": {
		PermViewSalesFloorAction,
		PermViewBackRoomActions,
		PermViewServiceActions,
		PermViewManagerActions,
		PermViewAdminActions,
	},
}

func hasPermission(role models.EmployeeRole, perm Permission) bool {
	perms, exists := rolePermissions[role]
	if !exists {
		return false
	}
	return slices.Contains(perms, perm)
}

func RequirePermission(requiredPerm Permission) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		userRole, exists := ctx.Get("role")

		if !exists {
			ctx.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Role not found in context"})
			return
		}

		role := models.EmployeeRole(userRole.(string))

		if !hasPermission(role, requiredPerm) {
			ctx.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions to perform this action"})
			return
		}

		ctx.Next()
	}
}
