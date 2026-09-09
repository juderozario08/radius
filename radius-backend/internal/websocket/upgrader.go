// radius-backend/internal/websocket/upgrader.go
package websocket

import (
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

// UpgraderConfig provides configuration parameters for the WebSocket upgrader.
type UpgraderConfig struct {
	ReadBufferSize   int
	WriteBufferSize  int
	HandshakeTimeout time.Duration
	AllowedOrigins   []string
}

// DefaultUpgraderConfig returns production defaults suited for Expo React Native and mobile clients.
func DefaultUpgraderConfig() UpgraderConfig {
	return UpgraderConfig{
		ReadBufferSize:   4096,
		WriteBufferSize:  4096,
		HandshakeTimeout: 10 * time.Second,
		AllowedOrigins:   nil, // Nil or empty allows all origins (ideal for Expo dev / LAN)
	}
}

// CheckOriginFunc returns an origin verification function according to configured allowed origins.
func CheckOriginFunc(allowedOrigins []string) func(r *http.Request) bool {
	return func(r *http.Request) bool {
		origin := r.Header.Get("Origin")

		// 1. Native mobile clients (iOS / Android React Native) and CLI dialers often omit the Origin header.
		if origin == "" {
			return true
		}

		// 2. In development or when no specific origins are restricted, allow all origins (Expo Metro:8081, web dev).
		if len(allowedOrigins) == 0 {
			return true
		}

		// 3. Match against allowed origins list.
		for _, allowed := range allowedOrigins {
			if allowed == "*" || strings.EqualFold(allowed, origin) {
				return true
			}
		}

		return false
	}
}

// Upgrader is the standard gorilla/websocket Upgrader instance.
var Upgrader = websocket.Upgrader{
	ReadBufferSize:   4096,
	WriteBufferSize:  4096,
	HandshakeTimeout: 10 * time.Second,
	CheckOrigin:      CheckOriginFunc(nil),
}

// NewUpgrader instantiates a gorilla/websocket.Upgrader configured with custom parameters.
func NewUpgrader(cfg ...UpgraderConfig) *websocket.Upgrader {
	c := DefaultUpgraderConfig()
	if len(cfg) > 0 {
		c = cfg[0]
	}

	return &websocket.Upgrader{
		ReadBufferSize:   c.ReadBufferSize,
		WriteBufferSize:  c.WriteBufferSize,
		HandshakeTimeout: c.HandshakeTimeout,
		CheckOrigin:      CheckOriginFunc(c.AllowedOrigins),
	}
}
