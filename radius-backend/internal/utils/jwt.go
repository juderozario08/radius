package utils

import (
	"radius/internal/models"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func GenerateToken(id int, email string, role models.EmployeeRole, jwtSecret []byte) (string, error) {
	claims := jwt.MapClaims{
		"employee_id": id,
		"email":       email,
		"role":        role,
		"exp":         time.Now().Add(time.Hour * 24).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}
