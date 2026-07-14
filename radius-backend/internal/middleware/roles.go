// radius-backend/internal/middleware/roles.go
package middleware

import (
	"fmt"
	"net/http"
	"radius/internal/models"
	"slices"

	"github.com/gin-gonic/gin"
)

type Permission string

const (
	PermViewSalesFloor       Permission = "view_sales_floor"
	PermViewBackRoom         Permission = "view_back_room"
	PermViewAdminActions     Permission = "view_admin_actions"
	PermViewInventory        Permission = "view_inventory"
	PermViewOrders           Permission = "view_orders"
	PermViewEmployees        Permission = "view_employees"
	PermManageEmployees      Permission = "manage_employees"
	PermManageSessions       Permission = "manage_sessions"
	PermViewTransfers        Permission = "view_transfers"
	PermApprovePO            Permission = "approve_po"
	PermSubmitItemAdjustment Permission = "submit_item_adjustment"
	PermDeleteOwnAdjustment  Permission = "delete_own_item_adjustment"
	PermAdjustInventory      Permission = "adjust_inventory"
	PermPerformCycleCount    Permission = "perform_cycle_count"
	PermProcessReturns       Permission = "process_returns"
)

var rolePermissions = map[models.EmployeeRole][]Permission{
	"SALES": {
		PermViewSalesFloor,
		PermViewInventory,
		PermViewOrders,
		PermSubmitItemAdjustment,
		PermDeleteOwnAdjustment,
	},
	"SERVICE": {
		PermViewSalesFloor,
		PermViewInventory,
		PermViewOrders,
		PermProcessReturns,
		PermSubmitItemAdjustment,
		PermDeleteOwnAdjustment,
	},
	"MANAGER": {
		PermViewSalesFloor,
		PermViewBackRoom,
		PermViewInventory,
		PermViewOrders,
		PermViewEmployees,
		PermViewTransfers,
		PermSubmitItemAdjustment,
		PermDeleteOwnAdjustment,
		PermAdjustInventory,
		PermPerformCycleCount,
		PermProcessReturns,
	},
	"ADMIN": {
		PermViewSalesFloor,
		PermViewBackRoom,
		PermViewAdminActions,
		PermViewInventory,
		PermViewOrders,
		PermViewEmployees,
		PermManageEmployees,
		PermManageSessions,
		PermViewTransfers,
		PermApprovePO,
		PermSubmitItemAdjustment,
		PermDeleteOwnAdjustment,
		PermAdjustInventory,
		PermPerformCycleCount,
		PermProcessReturns,
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

		fmt.Println("Role from context:", userRole)

		if !exists {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Role not found in context"})
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
