package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"radius/internal/models"
	"radius/internal/service"
	ws "radius/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	gorilla "github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

type WSHandler struct {
	hub          *ws.Hub
	jwtSecret    []byte
	authService  *service.AuthService
	employeeRepo service.EmployeeRepository
	upgrader     *gorilla.Upgrader
	redisClient  *redis.Client
}

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
		case *redis.Client:
			handler.redisClient = v
		}
	}

	return handler
}

func canAccessAnyStore(role models.EmployeeRole) bool {
	return role == models.RoleAdmin || role == models.RoleManager
}

func resolveRequestedStore(ctx *gin.Context, currentStore int, role models.EmployeeRole) (int, bool) {
	reqStoreID := ctx.Query("store_id")
	if reqStoreID == "" {
		return currentStore, true
	}
	parsed, err := strconv.Atoi(reqStoreID)
	if err != nil || parsed <= 0 {
		return currentStore, true
	}
	if parsed == currentStore || canAccessAnyStore(role) {
		return parsed, true
	}
	return currentStore, false
}

func (h *WSHandler) CreateTicket(ctx *gin.Context) {
	if h.redisClient == nil {
		log.Printf("[ERROR] WS CreateTicket: Redis client not configured")
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "Ticket service unavailable"})
		return
	}

	employeeID := ctx.GetInt("employee_id")
	email := ctx.GetString("email")
	role := models.EmployeeRole(ctx.GetString("role"))
	storeID := ctx.GetInt("store_id")

	resolvedStore, allowed := resolveRequestedStore(ctx, storeID, role)
	if !allowed {
		log.Printf("[WS FORBIDDEN] Employee %d (role %s) requested unauthorized store %s", employeeID, role, ctx.Query("store_id"))
		ctx.AbortWithStatusJSON(http.StatusForbidden, models.APIError{Error: "Not authorized for the requested store"})
		return
	}
	storeID = resolvedStore

	if storeID <= 0 {
		ctx.AbortWithStatusJSON(http.StatusForbidden, models.APIError{Error: "No store associated with this account"})
		return
	}

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		log.Printf("[ERROR] WS CreateTicket: Failed to generate random ticket: %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "Failed to generate ticket"})
		return
	}
	ticket := hex.EncodeToString(b)

	ticketData := models.WSTicketData{
		EmployeeID: employeeID,
		StoreID:    storeID,
		Role:       role,
		Email:      email,
	}

	data, err := json.Marshal(ticketData)
	if err != nil {
		log.Printf("[ERROR] WS CreateTicket: Failed to serialize ticket data: %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "Failed to serialize ticket"})
		return
	}

	if err := h.redisClient.Set(ctx.Request.Context(), "ws_ticket:"+ticket, data, 30*time.Second).Err(); err != nil {
		log.Printf("[ERROR] WS CreateTicket: Failed to store ticket in Redis: %v", err)
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "Failed to store ticket"})
		return
	}

	ctx.JSON(http.StatusOK, models.WSTicketResponse{
		Ticket:    ticket,
		ExpiresIn: 30,
	})
}

func (h *WSHandler) HandleWS(ctx *gin.Context) {
	h.HandleWebSocket(ctx)
}

func (h *WSHandler) HandleWebSocket(ctx *gin.Context) {
	var employeeID int
	var email string
	var role models.EmployeeRole
	var storeID int

	ticket := ctx.Query("ticket")
	if ticket != "" {
		if h.redisClient == nil {
			log.Printf("[WS UNAUTHORIZED] Redis not configured for ticket authentication")
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "Ticket authentication unavailable"})
			return
		}

		val, err := h.redisClient.GetDel(ctx.Request.Context(), "ws_ticket:"+ticket).Result()
		if err != nil {
			log.Printf("[WS UNAUTHORIZED] Invalid or expired connection ticket")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid or expired connection ticket"})
			return
		}

		var ticketData models.WSTicketData
		if err := json.Unmarshal([]byte(val), &ticketData); err != nil {
			log.Printf("[WS UNAUTHORIZED] Failed to deserialize ticket data: %v", err)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid connection ticket"})
			return
		}

		employeeID = ticketData.EmployeeID
		email = ticketData.Email
		role = ticketData.Role
		storeID = ticketData.StoreID

		resolvedStore, allowed := resolveRequestedStore(ctx, storeID, role)
		if !allowed {
			log.Printf("[WS FORBIDDEN] Employee %d (role %s) requested unauthorized store %s", employeeID, role, ctx.Query("store_id"))
			ctx.AbortWithStatusJSON(http.StatusForbidden, models.APIError{Error: "Not authorized for the requested store"})
			return
		}
		storeID = resolvedStore
	} else {
		var tokenString string

		authHeader := ctx.GetHeader("Authorization")
		if authHeader != "" {
			split := strings.Split(authHeader, " ")
			if len(split) == 2 && strings.EqualFold(split[0], "Bearer") {
				tokenString = split[1]
			}
		}

		if tokenString == "" {
			log.Printf("[WS UNAUTHORIZED] Missing authentication token")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Authentication token required"})
			return
		}

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

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			log.Printf("[WS UNAUTHORIZED] Failed to extract claims")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid token claims"})
			return
		}

		tokenType, exists := claims["token_type"]
		if !exists || tokenType != "access" {
			log.Printf("[WS UNAUTHORIZED] Non-access token provided")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid token type"})
			return
		}

		employeeIdRaw, ok := claims["employee_id"]
		if !ok {
			log.Printf("[WS UNAUTHORIZED] Missing employee_id claim")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Missing employee_id claim"})
			return
		}
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

		email, _ = claims["email"].(string)

		if roleStr, ok := claims["role"].(string); ok && roleStr != "" {
			role = models.EmployeeRole(roleStr)
		}

		if h.authService != nil {
			if err := h.authService.ValidateSession(ctx.Request.Context(), tokenString); err != nil {
				log.Printf("[WS UNAUTHORIZED] Session validation failed for employee %d: %v", employeeID, err)
				ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Session expired or terminated"})
				return
			}
		}

		if sidRaw, exists := claims["store_id"]; exists {
			switch v := sidRaw.(type) {
			case float64:
				storeID = int(v)
			case int:
				storeID = v
			}
		}

		resolvedStore, allowed := resolveRequestedStore(ctx, storeID, role)
		if !allowed {
			log.Printf("[WS FORBIDDEN] Employee %d (role %s) requested unauthorized store %s", employeeID, role, ctx.Query("store_id"))
			ctx.AbortWithStatusJSON(http.StatusForbidden, models.APIError{Error: "Not authorized for the requested store"})
			return
		}
		storeID = resolvedStore
	}

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

	if storeID <= 0 {
		log.Printf("[WS FORBIDDEN] Employee %d has no associated store", employeeID)
		ctx.AbortWithStatusJSON(http.StatusForbidden, models.APIError{Error: "No store associated with this account"})
		return
	}

	upgrader := h.upgrader
	if upgrader == nil {
		upgrader = ws.NewUpgrader()
	}

	conn, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
	if err != nil {
		log.Printf("[ERROR] WS Upgrade: Connection upgrade failed for employee %d: %v", employeeID, err)
		return
	}

	client := ws.NewClient(h.hub, conn, storeID, employeeID, role, email)
	h.hub.Register(client)

	go client.WritePump()
	go client.ReadPump()
}
