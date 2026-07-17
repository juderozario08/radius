//radius-backend/internal/middleware/auth.go
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
			log.Println("User missing authorization header")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "An error occured while authorizing the user."})
			return
		}

		split := strings.Split(authHeader, " ")
		if len(split) != 2 || split[0] != "Bearer" {
			log.Println("Invalid auth header format")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token format, expected 'Bearer <TOKEN>'"})
			return
		}
		tokenString := split[1]

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
			_, ok := token.Method.(*jwt.SigningMethodHMAC)
			if !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return secret, nil
		})
		if err != nil {
			log.Println("JWT parsing error:", err.Error())
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}
		if !token.Valid {
			log.Println("Token is invalid")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		if err := authService.ValidateSession(ctx.Request.Context(), tokenString); err != nil {
			log.Println("Session validation failed:", err.Error())
			ctx.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Invalid or expired token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			log.Println("Could not extract claims from token")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		employeeId, ok := claims["employee_id"]
		if !ok {
			log.Println("employee_id claim missing or wrong type")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		ctx.Set("employee_id", int(employeeId.(float64))) // the float conversion is because JSON converts numbers into float by default
		ctx.Set("email", claims["email"])
		ctx.Set("role", claims["role"])
		ctx.Set("token_string", tokenString)
		ctx.Next()
	}
}
