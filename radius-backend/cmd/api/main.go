package main

import (
	"fmt"
	"net/http"
	"radius/internal/middleware"

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

func Signup(ctx *gin.Context) {
	var body SignupBody

	err := ctx.ShouldBindJSON(&body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "Data received",
		"name":    body.FirstName + " " + body.LastName,
		"email":   body.Email,
	})
}

func main() {
	router := gin.Default()

	router.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"status":  http.StatusOK,
			"message": "Server is working!",
		})
	})

	router.POST("/register", Signup)

	api := router.Group("/api")
	api.Use(middleware.RequireAuth())
	{
		api.POST("/login", Login)
		api.POST("/logout")
	}

	fmt.Println("Listening on PORT 8080")
	fmt.Println("http://0.0.0.0:8080")
	router.Run()
}
