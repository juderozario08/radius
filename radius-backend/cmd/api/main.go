package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"radius/internal/database"
	"radius/internal/middleware"
	"radius/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Printf(".env file does not exist")
		return
	}

	db, err := database.ConnectDB()
	if err != nil {
		log.Printf("Error connecting to database: %v\n", err)
		return
	}

	err = db.RunMigrations("migrations")
	if err != nil {
		log.Printf("Could not run migrations: %v\n", err)
	}

	router := gin.Default()

	router.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"status":  http.StatusOK,
			"message": "Server is working!",
		})
	})

	router.POST("/register", service.Register)
	router.POST("/login", service.Login)

	api := router.Group("/api")
	api.Use(middleware.RequireAuth())
	{
		api.POST("/logout", service.Logout)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Println("Listening on PORT " + port)
	fmt.Println("http://0.0.0.0:" + port)
	router.Run()
}
