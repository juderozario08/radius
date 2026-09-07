// radius-backend/internal/handler/ws_handler.go
package handler

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"radius/internal/models"
	"radius/internal/service"
	ws "radius/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	gorilla "github.com/gorilla/websocket"
)

// WSHandler manages WebSocket HTTP upgrade handshakes, dual-authentication, and client registration.
type WSHandler struct {
	hub          *ws.Hub
	jwtSecret    []byte
	authService  *service.AuthService
	employeeRepo service.EmployeeRepository
	upgrader     *gorilla.Upgrader
}

// NewWSHandler creates a new WSHandler supporting flexible dependency injection.
// Arguments:
// - hub: *ws.Hub (required)
// - jwtSecret: []byte (required)
// - authService: *service.AuthService (optional / nullable)
// - args: optional employeeRepo (service.EmployeeRepository) and/or upgrader (*gorilla.Upgrader)
func NewWSHandler(
	hub *ws.Hub,
	jwtSecret []byte,
	authService *service.AuthService,
	args ...any,
) *WSHandler {
	handler := &WSHandler{
		hub:         hub,
		jwtSecret:   jwtSecret,
		authService: authService,
	}

	for _, arg := range args {
		switch v := arg.(type) {
		case service.EmployeeRepository:
			handler.employeeRepo = v
		case *gorilla.Upgrader:
			handler.upgrader = v
		}
	}

	return handler
}

// HandleWS is an alias for HandleWebSocket matching router and spec miner test naming.
func (h *WSHandler) HandleWS(ctx *gin.Context) {
	h.HandleWebSocket(ctx)
}

// HandleWebSocket authenticates the handshake request and upgrades to a real-time WebSocket connection.
func (h *WSHandler) HandleWebSocket(ctx *gin.Context) {
	var tokenString string

	// 1. Dual Authentication: Check Authorization Header first (Bearer <token>)
	authHeader := ctx.GetHeader("Authorization")
	if authHeader != "" {
		split := strings.Split(authHeader, " ")
		if len(split) == 2 && strings.EqualFold(split[0], "Bearer") {
			tokenString = split[1]
		}
	}

	// Fallback to URL query parameter (?token=<token>) for Expo React Native clients
	if tokenString == "" {
		tokenString = ctx.Query("token")
	}

	if tokenString == "" {
		log.Printf("[WS UNAUTHORIZED] Missing authentication token in header and query")
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Authentication token required"})
		return
	}

	// 2. JWT Cryptographic Verification & Parsing
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return h.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		log.Printf("[WS UNAUTHORIZED] Invalid or expired JWT: %v", err)
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid or expired token"})
		return
	}

	// 3. Claims Extraction & Validation
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		log.Printf("[WS UNAUTHORIZED] Failed to extract claims")
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid token claims"})
		return
	}

	// Enforce token_type == "access"
	tokenType, exists := claims["token_type"]
	if !exists || tokenType != "access" {
		log.Printf("[WS UNAUTHORIZED] Non-access token provided")
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid token type"})
		return
	}

	// Extract employee_id safely (handling float64 from JSON)
	employeeIdRaw, ok := claims["employee_id"]
	if !ok {
		log.Printf("[WS UNAUTHORIZED] Missing employee_id claim")
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Missing employee_id claim"})
		return
	}
	var employeeID int
	switch v := employeeIdRaw.(type) {
	case float64:
		employeeID = int(v)
	case int:
		employeeID = v
	default:
		log.Printf("[WS UNAUTHORIZED] Non-numeric employee_id claim")
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid employee_id claim"})
		return
	}

	// Extract email
	email, _ := claims["email"].(string)

	// Extract role
	var role models.EmployeeRole
	if roleStr, ok := claims["role"].(string); ok && roleStr != "" {
		role = models.EmployeeRole(roleStr)
	}

	// 4. Active Session Verification (if AuthService provided)
	if h.authService != nil {
		if err := h.authService.ValidateSession(ctx.Request.Context(), tokenString); err != nil {
			log.Printf("[WS UNAUTHORIZED] Session validation failed for employee %d: %v", employeeID, err)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Session expired or terminated"})
			return
		}
	}

	// 5. Store ID Resolution
	var storeID int

	// Check if explicit store_id passed via query param (e.g., ?store_id=2)
	if reqStoreID := ctx.Query("store_id"); reqStoreID != "" {
		if parsed, err := strconv.Atoi(reqStoreID); err == nil && parsed > 0 {
			storeID = parsed
		}
	}

	// Check if store_id is present in JWT claims
	if storeID <= 0 {
		if sidRaw, exists := claims["store_id"]; exists {
			switch v := sidRaw.(type) {
			case float64:
				storeID = int(v)
			case int:
				storeID = v
			}
		}
	}

	// Primary lookup from Employee repository if available
	if h.employeeRepo != nil {
		employee, err := h.employeeRepo.GetEmployeeById(ctx.Request.Context(), employeeID)
		if err != nil {
			log.Printf("[ERROR] WS Upgrade: Database error resolving employee %d: %v", employeeID, err)
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "Failed to resolve employee record"})
			return
		}
		if employee == nil {
			log.Printf("[WS UNAUTHORIZED] Employee %d not found in database", employeeID)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Employee not found"})
			return
		}
		if employee.IsActive != nil && !(*employee.IsActive) {
			log.Printf("[WS UNAUTHORIZED] Employee %d account is inactive", employeeID)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Account inactive"})
			return
		}
		if employee.IsTerminated != nil && *employee.IsTerminated {
			log.Printf("[WS UNAUTHORIZED] Employee %d account is terminated", employeeID)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Account terminated"})
			return
		}

		if storeID <= 0 {
			storeID = employee.StoreId
		}
		if role == "" {
			role = employee.Role
		}
	}

	// Fallback storeID default
	if storeID <= 0 {
		storeID = 1
	}

	// 6. Protocol Upgrade: Switch to WebSocket
	upgrader := h.upgrader
	if upgrader == nil {
		upgrader = &ws.Upgrader
	}

	conn, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
	if err != nil {
		log.Printf("[ERROR] WS Upgrade: Connection upgrade failed for employee %d: %v", employeeID, err)
		return
	}

	// 7. Instantiate Client & Register with Hub
	client := ws.NewClient(h.hub, conn, storeID, employeeID, role, email)
	h.hub.Register(client)

	// 8. Launch Concurrent Read & Write Pumps
	go client.WritePump()
	go client.ReadPump()
}
