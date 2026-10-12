package middleware

import (
	"crypto/rand"
	"encoding/json"
	"net/http"
	"radius/internal/logging"
	"strconv"

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

type errorRequestIDWriter struct {
	gin.ResponseWriter
	requestID string
}

func (w *errorRequestIDWriter) Write(b []byte) (int, error) {
	if w.Status() >= http.StatusBadRequest && len(b) > 0 && b[0] == '{' {
		var payload map[string]any
		if err := json.Unmarshal(b, &payload); err == nil {
			if _, hasError := payload["error"]; hasError {
				if existing, hasReq := payload["request_id"]; !hasReq || existing == "" {
					payload["request_id"] = w.requestID
					if updated, err := json.Marshal(payload); err == nil {
						w.Header().Set("Content-Length", strconv.Itoa(len(updated)))
						return w.ResponseWriter.Write(updated)
					}
				}
			}
		}
	}
	return w.ResponseWriter.Write(b)
}

func (w *errorRequestIDWriter) WriteString(s string) (int, error) {
	return w.Write([]byte(s))
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
		c.Writer = &errorRequestIDWriter{
			ResponseWriter: c.Writer,
			requestID:      id,
		}
		c.Next()
	}
}
