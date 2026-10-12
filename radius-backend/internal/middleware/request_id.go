package middleware

import (
	"crypto/rand"
	"radius/internal/logging"

	"github.com/gin-gonic/gin"
)

const (
	RequestIDHeader    = "X-Request-ID"
	maxRequestIDLength = 128
)

func validRequestID(id string) bool {
	if id == "" || len(id) > maxRequestIDLength {
		return false
	}
	for _, r := range id {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_', r == '.':
		default:
			return false
		}
	}
	return true
}

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(RequestIDHeader)
		if !validRequestID(id) {
			id = rand.Text()
		}
		c.Set(logging.RequestIDKey, id)
		c.Request = c.Request.WithContext(logging.WithRequestID(c.Request.Context(), id))
		c.Header(RequestIDHeader, id)
		c.Next()
	}
}
