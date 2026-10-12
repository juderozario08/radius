package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

var quietPaths = map[string]bool{
	"/health": true,
	"/ready":  true,
}

func AccessLog(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		status := c.Writer.Status()
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		level := slog.LevelInfo
		switch {
		case status >= http.StatusInternalServerError:
			level = slog.LevelError
		case quietPaths[path]:
			level = slog.LevelDebug
		}

		attrs := []slog.Attr{
			slog.String("method", c.Request.Method),
			slog.String("path", path),
			slog.Int("status", status),
			slog.Float64("latency_ms", float64(time.Since(start).Microseconds())/1000),
			slog.String("client_ip", c.ClientIP()),
		}
		if employeeID, ok := c.Get("employee_id"); ok {
			attrs = append(attrs, slog.Any("employee_id", employeeID))
		}
		logger.LogAttrs(c.Request.Context(), level, "request", attrs...)
	}
}
