package main

import (
	"fmt"
	"log"
	"os"
	"radius/internal/database"
	"radius/internal/repository"
	"radius/internal/router"

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

	employeeRepo := repository.NewEmployeeRepo(db)

	router := router.NewRouter()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Listening on PORT " + port)
	fmt.Println("http://0.0.0.0:" + port)
	router.Run()
}
