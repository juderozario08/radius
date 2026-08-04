// radius-backend/internal/middleware/rate_limit.go
package middleware

import (
	"log"
	"net/http"
	"radius/internal/models"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type IPRateLimiter struct {
	ips map[string]*rate.Limiter
	mu  *sync.RWMutex
	r   rate.Limit
	b   int
}

func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	return &IPRateLimiter{
		ips: make(map[string]*rate.Limiter),
		mu:  &sync.RWMutex{},
		r:   r,
		b:   b,
	}
}

func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	limiter, exists := i.ips[ip]
	if !exists {
		limiter = rate.NewLimiter(i.r, i.b)
		i.ips[ip] = limiter
	}

	return limiter
}

func RateLimitMiddleware(limiter *IPRateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		if !limiter.GetLimiter(clientIP).Allow() {
			log.Printf("[RATE LIMIT] Request blocked from IP: %s", clientIP)
			c.AbortWithStatusJSON(http.StatusTooManyRequests, models.APIError{
				Error: "Too many requests. Please try again later.",
			})
			return
		}

		c.Next()
	}
}
