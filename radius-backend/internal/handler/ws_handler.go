package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/utils"
	ws "radius/internal/websocket"

	"github.com/gin-gonic/gin"
	gorilla "github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

type WSHandler struct {
	hub         *ws.Hub
	authService *service.AuthService
	upgrader    *gorilla.Upgrader
	redisClient *redis.Client
}

func NewWSHandler(
	hub *ws.Hub,
	authService *service.AuthService,
	args ...any,
) *WSHandler {
	handler := &WSHandler{
		hub:         hub,
		authService: authService,
	}

	for _, arg := range args {
		switch v := arg.(type) {
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

func resolveRequestedStore(ctx *gin.Context, defaultStore int, homeStore int, role models.EmployeeRole) (int, bool) {
	store := defaultStore
	if parsed, err := strconv.Atoi(ctx.Query("store_id")); err == nil && parsed > 0 {
		store = parsed
	}
	return store, store == homeStore || canAccessAnyStore(role)
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

	resolvedStore, allowed := resolveRequestedStore(ctx, storeID, storeID, role)
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
	if h.authService == nil {
		log.Printf("[ERROR] WS Upgrade: Auth service not configured")
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "Authentication unavailable"})
		return
	}

	var auth *models.AuthContext
	var defaultStore int

	if ticket := ctx.Query("ticket"); ticket != "" {
		ticketData, ok := h.consumeTicket(ctx, ticket)
		if !ok {
			return
		}
		empCtx, err := h.authService.ActiveEmployeeContext(ctx.Request.Context(), ticketData.EmployeeID)
		if err != nil {
			log.Printf("[WS UNAUTHORIZED] Ticket employee %d rejected: %v", ticketData.EmployeeID, err)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: service.AuthErrorMessage(err)})
			return
		}
		auth = &models.AuthContext{
			EmployeeId: ticketData.EmployeeID,
			Email:      ticketData.Email,
			Role:       empCtx.Role,
			StoreId:    empCtx.StoreId,
		}
		defaultStore = ticketData.StoreID
	} else {
		tokenString, ok := utils.ParseBearerToken(ctx.GetHeader("Authorization"))
		if !ok {
			log.Printf("[WS UNAUTHORIZED] Missing authentication token")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Authentication token required"})
			return
		}
		authCtx, err := h.authService.Authenticate(ctx.Request.Context(), tokenString)
		if err != nil {
			log.Printf("[WS UNAUTHORIZED] %v", err)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: service.AuthErrorMessage(err)})
			return
		}
		auth = authCtx
		defaultStore = authCtx.StoreId
	}

	employeeID, role, email := auth.EmployeeId, auth.Role, auth.Email
	storeID, allowed := resolveRequestedStore(ctx, defaultStore, auth.StoreId, role)
	if !allowed {
		log.Printf("[WS FORBIDDEN] Employee %d (role %s) requested unauthorized store %d", employeeID, role, storeID)
		ctx.AbortWithStatusJSON(http.StatusForbidden, models.APIError{Error: "Not authorized for the requested store"})
		return
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

func (h *WSHandler) consumeTicket(ctx *gin.Context, ticket string) (*models.WSTicketData, bool) {
	if h.redisClient == nil {
		log.Printf("[WS UNAUTHORIZED] Redis not configured for ticket authentication")
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, models.APIError{Error: "Ticket authentication unavailable"})
		return nil, false
	}

	val, err := h.redisClient.GetDel(ctx.Request.Context(), "ws_ticket:"+ticket).Result()
	if err != nil {
		log.Printf("[WS UNAUTHORIZED] Invalid or expired connection ticket")
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid or expired connection ticket"})
		return nil, false
	}

	var ticketData models.WSTicketData
	if err := json.Unmarshal([]byte(val), &ticketData); err != nil {
		log.Printf("[WS UNAUTHORIZED] Failed to deserialize ticket data: %v", err)
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid connection ticket"})
		return nil, false
	}
	return &ticketData, true
}
