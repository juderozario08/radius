package main

import (
	"fmt"
	"log"
	"os"
	"radius/internal/database"
	"radius/internal/repository"
	"radius/internal/router"
	"radius/internal/service"

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

	employeeRepo := repository.NewEmployeeRepo(db.DB)
	_ = employeeRepo
	sessionRepo := repository.NewSessionRepo(db.DB)
	_ = sessionRepo
	storeRepo := repository.NewStoreRepo(db.DB)
	_ = storeRepo
	inventoryRepo := repository.NewInventoryRepo(db.DB)
	_ = inventoryRepo
	merchandisingRepo := repository.NewMerchandisingRepo(db.DB)
	_ = merchandisingRepo
	ordersRepo := repository.NewOrdersRepo(db.DB)
	_ = ordersRepo
	productsRepo := repository.NewProductRepo(db.DB)
	_ = productsRepo
	salesRepo := repository.NewSalesRepo(db.DB)
	_ = salesRepo

	jwtSecretCode := os.Getenv("JWT_SECRET_CODE")
	if jwtSecretCode == "" {
		log.Printf("Could not find JWT_SECRET_CODE\n")
		return
	}

	authService := service.NewAuthService(employeeRepo, sessionRepo, []byte(jwtSecretCode))
	_ = authService

	router := router.NewRouter()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Listening on PORT " + port)
	fmt.Println("http://0.0.0.0:" + port)
	router.Run()
}
