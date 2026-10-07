package utils

import (
	"crypto/rand"
	"encoding/hex"
	"radius/internal/models"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	AccessTokenExpiry        = 15 * time.Minute
	SessionInactivityTimeout = 24 * time.Hour
	MaxSessionLifetime       = 7 * 24 * time.Hour
)

func generateToken(id int, email string, role models.EmployeeRole, storeId int, tokenType string, expiry time.Duration, jwtSecret []byte) (string, error) {
	var nonce [16]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		return "", err
	}
	claims := jwt.MapClaims{
		"jti":         hex.EncodeToString(nonce[:]),
		"employee_id": id,
		"email":       email,
		"role":        role,
		"store_id":    storeId,
		"token_type":  tokenType,
		"iat":         time.Now().Unix(),
		"exp":         time.Now().Add(expiry).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func GenerateAccessToken(id int, email string, role models.EmployeeRole, storeId int, jwtSecret []byte) (string, error) {
	return generateToken(id, email, role, storeId, "access", AccessTokenExpiry, jwtSecret)
}

func GenerateRefreshToken(id int, email string, role models.EmployeeRole, storeId int, jwtSecret []byte) (string, error) {
	return generateToken(id, email, role, storeId, "refresh", MaxSessionLifetime, jwtSecret)
}
