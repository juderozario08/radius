package middleware

import (
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type etagWriter struct {
	gin.ResponseWriter
	body       *bytes.Buffer
	statusCode int
}

func (w *etagWriter) WriteHeader(code int) {
	w.statusCode = code
}

func (w *etagWriter) Write(b []byte) (int, error) {
	return w.body.Write(b)
}

func (w *etagWriter) WriteString(s string) (int, error) {
	return w.body.WriteString(s)
}

func (w *etagWriter) Status() int {
	if w.statusCode == 0 {
		return http.StatusOK
	}
	return w.statusCode
}

func ETagMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			c.Next()
			return
		}

		if strings.EqualFold(c.GetHeader("Upgrade"), "websocket") ||
			strings.Contains(strings.ToLower(c.GetHeader("Connection")), "upgrade") {
			c.Next()
			return
		}

		w := &etagWriter{
			ResponseWriter: c.Writer,
			body:           &bytes.Buffer{},
			statusCode:     http.StatusOK,
		}
		c.Writer = w

		c.Next()

		status := w.Status()

		if status == http.StatusOK && w.body.Len() > 0 {
			h := sha1.Sum(w.body.Bytes())
			etag := `"` + hex.EncodeToString(h[:]) + `"`
			w.Header().Set("ETag", etag)

			clientETag := c.GetHeader("If-None-Match")
			if clientETag != "" {
				clientETag = strings.TrimSpace(clientETag)
				match := false
				for _, candidate := range strings.Split(clientETag, ",") {
					candidate = strings.TrimSpace(candidate)
					if candidate == "*" || candidate == etag || strings.TrimPrefix(candidate, "W/") == etag {
						match = true
						break
					}
				}
				if match {
					w.ResponseWriter.WriteHeader(http.StatusNotModified)
					return
				}
			}
		}

		w.ResponseWriter.WriteHeader(status)
		_, _ = w.ResponseWriter.Write(w.body.Bytes())
	}
}
