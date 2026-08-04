// radius-backend/internal/middleware/rate_limit.go
package middleware

import (
	"log"
	"net/http"
	"radius/internal/models"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type ipEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type IPRateLimiter struct {
	ips map[string]*ipEntry
	mu  *sync.RWMutex
	r   rate.Limit
	b   int
}

func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	limiter := &IPRateLimiter{
		ips: make(map[string]*ipEntry),
		mu:  &sync.RWMutex{},
		r:   r,
		b:   b,
	}
	go limiter.cleanupLoop(10 * time.Minute)

	return limiter
}

func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	entry, exists := i.ips[ip]
	if !exists {
		entry = &ipEntry{
			limiter:  rate.NewLimiter(i.r, i.b),
			lastSeen: time.Now(),
		}
		i.ips[ip] = entry
	} else {
		entry.lastSeen = time.Now()
	}

	return entry.limiter
}

func (i *IPRateLimiter) cleanupLoop(ttl time.Duration) {
	ticker := time.NewTicker(ttl)
	defer ticker.Stop()

	for range ticker.C {
		i.mu.Lock()
		for ip, entry := range i.ips {
			if time.Since(entry.lastSeen) > ttl {
				delete(i.ips, ip)
			}
		}
		i.mu.Unlock()
	}
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
