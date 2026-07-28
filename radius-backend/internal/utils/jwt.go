//radius-backend/internal/utils/jwt.go
package utils

import (
	"radius/internal/models"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	AccessTokenExpiry        = 15 * time.Minute
	SessionInactivityTimeout = 24 * time.Hour     // sliding window — DB expires_at
	MaxSessionLifetime       = 7 * 24 * time.Hour // hard ceiling — JWT exp
)

func generateToken(id int, email string, role models.EmployeeRole, tokenType string, expiry time.Duration, jwtSecret []byte) (string, error) {
	claims := jwt.MapClaims{
		"employee_id": id,
		"email":       email,
		"role":        role,
		"token_type":  tokenType,
		"iat":         time.Now().Unix(),
		"exp":         time.Now().Add(expiry).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func GenerateAccessToken(id int, email string, role models.EmployeeRole, jwtSecret []byte) (string, error) {
	return generateToken(id, email, role, "access", AccessTokenExpiry, jwtSecret)
}

func GenerateRefreshToken(id int, email string, role models.EmployeeRole, jwtSecret []byte) (string, error) {
	return generateToken(id, email, role, "refresh", MaxSessionLifetime, jwtSecret)
}
