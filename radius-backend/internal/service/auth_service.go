package service

import (
	"log"
	"net/http"
	"net/mail"
	"radius/internal/repository"

	"github.com/gin-gonic/gin"
)

type SignupBody struct {
	FirstName       string `json:"first_name" binding:"required"`
	LastName        string `json:"last_name" binding:"required"`
	Email           string `json:"email" binding:"required"`
	Password        string `json:"password" binding:"required"`
	ConfirmPassword string `json:"confirm_password" binding:"required"`
}

type LoginBody struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthService struct {
	employeeRepo *repository.EmployeeRepo
	sessionRepo  *repository.SessionRepo
	jwtSecret    []byte
}

func NewAuthService(employeeRepo *repository.EmployeeRepo, sessionRepo *repository.SessionRepo, jwtSecret []byte) *AuthService {
	return &AuthService{
		employeeRepo: employeeRepo,
		sessionRepo:  sessionRepo,
		jwtSecret:    jwtSecret,
	}
}

func Login(ctx *gin.Context) {
	var body LoginBody

	err := ctx.ShouldBindJSON(&body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "Data received",
		"email":   body.Email,
	})
}

func checkEmailPattern(email string) bool {
	_, err := mail.ParseAddress(email)
	if err != nil {
		log.Printf("%v is invalid: %v\n", email, err)
		return false
	}
	return true
}

func Register(ctx *gin.Context) {
	var body SignupBody

	err := ctx.ShouldBindJSON(&body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	errorMessageString := ""
	if body.FirstName == "" {
		errorMessageString += "First name is missing. "
	}

	if body.LastName == "" {
		errorMessageString += "Last name is missing. "
	}

	if body.Email == "" {
		errorMessageString += "Email is missing. "
	}

	if !checkEmailPattern(body.Email) {
		errorMessageString += "Email format is not accurate. "
	}

	if body.Password == "" {
		errorMessageString += "Password is missing. "
	}

	if body.ConfirmPassword == "" {
		errorMessageString += "Confirm Password is missing. "
	}

	if body.ConfirmPassword != body.Password {
		errorMessageString += "Password and Confirm Password does not match. "
	}

	if errorMessageString != "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"error": errorMessageString,
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "Data received",
		"name":    body.FirstName + " " + body.LastName,
		"email":   body.Email,
	})
}

func Logout(ctx *gin.Context) {
}
