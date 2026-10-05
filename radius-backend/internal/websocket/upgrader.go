package websocket

import (
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

type UpgraderConfig struct {
	ReadBufferSize   int
	WriteBufferSize  int
	HandshakeTimeout time.Duration
	AllowedOrigins   []string
	FailClosed       bool
}

func DefaultUpgraderConfig() UpgraderConfig {
	return UpgraderConfig{
		ReadBufferSize:   4096,
		WriteBufferSize:  4096,
		HandshakeTimeout: 10 * time.Second,
		AllowedOrigins:   nil,
		FailClosed:       false,
	}
}

func CheckOriginFunc(allowedOrigins []string, failClosed bool) func(r *http.Request) bool {
	return func(r *http.Request) bool {
		origin := r.Header.Get("Origin")

		if origin == "" {
			return !failClosed
		}

		if len(allowedOrigins) == 0 {
			return !failClosed
		}

		for _, allowed := range allowedOrigins {
			if allowed == "*" || strings.EqualFold(allowed, origin) {
				return true
			}
		}

		return false
	}
}

func NewUpgrader(cfg ...UpgraderConfig) *websocket.Upgrader {
	c := DefaultUpgraderConfig()
	if len(cfg) > 0 {
		c = cfg[0]
	}

	return &websocket.Upgrader{
		ReadBufferSize:   c.ReadBufferSize,
		WriteBufferSize:  c.WriteBufferSize,
		HandshakeTimeout: c.HandshakeTimeout,
		CheckOrigin:      CheckOriginFunc(c.AllowedOrigins, c.FailClosed),
	}
}
