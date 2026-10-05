package middleware

import (
	"fmt"
	"log"
	"net/http"
	"radius/internal/models"
	"radius/internal/service"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func RequireAuth(secret []byte, authService *service.AuthService) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")
		if authHeader == "" {
			log.Printf("[UNAUTHORIZED] RequireAuth: User missing authorization header")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "An error occured while authorizing the user."})
			return
		}

		split := strings.Split(authHeader, " ")
		if len(split) != 2 || split[0] != "Bearer" {
			log.Printf("[UNAUTHORIZED] RequireAuth: Invalid auth header format")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "invalid token format, expected 'Bearer <TOKEN>'"})
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
			log.Printf("[UNAUTHORIZED] RequireAuth: JWT parsing error: %v", err)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid or expired token"})
			return
		}
		if !token.Valid {
			log.Printf("[UNAUTHORIZED] RequireAuth: Token is invalid")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid or expired token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			log.Printf("[UNAUTHORIZED] RequireAuth: Could not extract claims from token")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid or expired token"})
			return
		}

		tokenType, exists := claims["token_type"]
		if !exists || tokenType != "access" {
			log.Printf("[UNAUTHORIZED] RequireAuth: Rejected non-access token used in Authorization header")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid or expired token"})
			return
		}

		if err := authService.ValidateSession(ctx.Request.Context(), tokenString); err != nil {
			log.Printf("[UNAUTHORIZED] RequireAuth: Session validation failed: %v", err)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid or expired token"})
			return
		}

		employeeIdRaw, ok := claims["employee_id"]
		if !ok {
			log.Printf("[UNAUTHORIZED] RequireAuth: employee_id claim missing")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid or expired token"})
			return
		}
		employeeIdFloat, ok := employeeIdRaw.(float64)
		if !ok {
			log.Printf("[UNAUTHORIZED] RequireAuth: employee_id claim is not a number")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid or expired token"})
			return
		}

		emailClaim, _ := claims["email"].(string)
		roleClaim, _ := claims["role"].(string)

		empId := int(employeeIdFloat)
		empCtx, empErr := authService.GetEmployeeContext(ctx.Request.Context(), empId)
		if empErr != nil {
			log.Printf("[UNAUTHORIZED] RequireAuth: Employee context error: %v", empErr)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Invalid or expired token"})
			return
		}
		if empCtx != nil {
			if empCtx.IsTerminated {
				log.Printf("[UNAUTHORIZED] RequireAuth: Employee %d is terminated", empId)
				ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Terminated Account"})
				return
			}
			if !empCtx.IsActive {
				log.Printf("[UNAUTHORIZED] RequireAuth: Employee %d is inactive", empId)
				ctx.AbortWithStatusJSON(http.StatusUnauthorized, models.APIError{Error: "Inactive account"})
				return
			}
			roleClaim = string(empCtx.Role)
		}

		ctx.Set("employee_id", empId)
		ctx.Set("email", emailClaim)
		ctx.Set("role", roleClaim)
		ctx.Set("token_string", tokenString)

		if empCtx != nil && empCtx.StoreId > 0 {
			ctx.Set("store_id", empCtx.StoreId)
		} else if storeIdRaw, ok := claims["store_id"]; ok {
			if storeIdFloat, ok := storeIdRaw.(float64); ok {
				ctx.Set("store_id", int(storeIdFloat))
			}
		}

		ctx.Next()
	}
}
