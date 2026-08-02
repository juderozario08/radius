package main

import (
	"log"
	"os"
	"radius/internal/database"

	"github.com/joho/godotenv"
)

func main() {
	if os.Getenv("GIN_MODE") != "release" {
		godotenv.Load()
	}

	db, err := database.ConnectDB()
	if err != nil {
		log.Fatalf("Error connecting to database: %v\n", err)
	}
	defer db.Close()

	err = db.RunMigrations("migrations")
	if err != nil {
		log.Fatalf("Could not run migrations: %v\n", err)
	}

	log.Println("Migrations applied successfully!")
}
