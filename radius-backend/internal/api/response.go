package api

import (
	"radius/internal/models"

	"github.com/gin-gonic/gin"
)

func Success(c *gin.Context, status int, data any) {
	c.JSON(status, data)
}

func Message(c *gin.Context, status int, message string) {
	c.JSON(status, models.APIMessage{Message: message})
}

func Error(c *gin.Context, status int, message string) {
	c.JSON(status, models.APIError{Error: message})
}

func AbortError(c *gin.Context, status int, message string) {
	c.AbortWithStatusJSON(status, models.APIError{Error: message})
}

func ErrorWithDetails(c *gin.Context, status int, message string, details string) {
	c.JSON(status, gin.H{
		"error":   message,
		"details": details,
	})
}
