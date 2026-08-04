package main

import (
	"log"
	"radius/internal/config"
	"radius/internal/database"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.ConnectDB(cfg.DatabaseURL)
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
