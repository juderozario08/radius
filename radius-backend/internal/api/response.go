package api

import (
	"github.com/gin-gonic/gin"
)

// Success responds with a standard JSON success payload
func Success(c *gin.Context, status int, data interface{}) {
	c.JSON(status, data)
}

// Error responds with a standard JSON error payload
func Error(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

// ErrorWithDetails responds with an error payload including detailed context
func ErrorWithDetails(c *gin.Context, status int, message string, details string) {
	c.JSON(status, gin.H{
		"error":   message,
		"details": details,
	})
}
