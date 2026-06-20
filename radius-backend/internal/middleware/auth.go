package middleware

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func RequireAuth() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")
		if authHeader == "" {
			log.Println("Missing authorization header")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing Authorization Header"})
			return
		}

		split := strings.Split(authHeader, " ")
		if len(split) != 2 || split[0] != "Bearer" {
			log.Println("Invalid Auth Header Format! Expected 'Bearer <TOKEN>'")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format. Expected 'Bearer <TOKEN>'"})
			return
		}

		tokenString := split[1]
		if tokenString == "" {
			fmt.Println("Invalid token: ", tokenString)
			ctx.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid token!"})
			return
		}
		fmt.Println("Welcome " + ctx.ClientIP() + "!")
	}
}
