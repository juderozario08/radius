package middleware

import (
	"fmt"
	"log"
	"net/http"
	"radius/internal/service"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func RequireAuth(secret []byte, authService *service.AuthService) gin.HandlerFunc {
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

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
			_, ok := token.Method.(*jwt.SigningMethodHMAC)
			if !ok {
				return nil, fmt.Errorf("Unexpected signing method\n")
			}
			return secret, nil
		})
		if err != nil {
			log.Println("JWT Parsing Error: ", err.Error())
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}
		if !token.Valid {
			log.Println("Token is invalid (no specific error)")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		err = authService.ValidateSession(ctx.Request.Context(), tokenString)
		if err != nil {
			log.Println("Session not found. Error: ", err.Error())
			ctx.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Session not found. Error: " + err.Error()})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if ok {
			ctx.Set("employee_id", claims["employee_id"])
			ctx.Set("email", claims["email"])
			ctx.Set("role", claims["role"])
		}
		ctx.Set("token_string", tokenString)
		ctx.Next()
	}
}
