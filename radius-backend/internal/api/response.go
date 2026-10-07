package api

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

var (
	ErrForbidden  = errors.New("forbidden")
	ErrNotFound   = errors.New("not found")
	ErrConflict   = errors.New("conflict")
	ErrValidation = errors.New("validation error")
)

func Success(c *gin.Context, status int, value any) { c.JSON(status, value) }

func Error(c *gin.Context, status int, message string) { c.JSON(status, gin.H{"error": message}) }

func ErrorWithDetails(c *gin.Context, status int, message, details string) {
	c.JSON(status, gin.H{"error": message, "details": details})
}

func Message(c *gin.Context, status int, message string) { c.JSON(status, gin.H{"message": message}) }

func HandleError(c *gin.Context, err error, fallback string) {
	status := http.StatusInternalServerError
	message := "An internal error occurred"
	switch {
	case errors.Is(err, ErrForbidden):
		status, message = http.StatusForbidden, "You are not authorized to perform this action"
	case errors.Is(err, ErrNotFound):
		status, message = http.StatusNotFound, "Resource not found"
	case errors.Is(err, ErrConflict):
		status, message = http.StatusConflict, fallback
	case errors.Is(err, ErrValidation):
		status, message = http.StatusBadRequest, fallback
	default:
		log.Printf("[ERROR] %s: %v", fallback, err)
	}
	c.JSON(status, gin.H{"error": message})
}
