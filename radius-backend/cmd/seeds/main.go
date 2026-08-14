package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("No .env file found, relying on existing environment variables")
	}

	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		log.Fatal("DATABASE_URL is not set in the environment")
	}

	// Connect to the database
	db, err := sql.Open("postgres", dbUrl)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	fmt.Println("Successfully connected to Postgres Database.")

	seedsDir := "seeds"
	files, err := os.ReadDir(seedsDir)
	if err != nil {
		log.Fatalf("Failed to read seeds directory: %v", err)
	}

	var sqlFiles []string
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".sql") {
			sqlFiles = append(sqlFiles, f.Name())
		}
	}

	// Sort files alphabetically to ensure numbered order execution
	sort.Strings(sqlFiles)

	if len(sqlFiles) == 0 {
		fmt.Println("No SQL seed files found in the 'seeds' directory.")
		return
	}

	fmt.Printf("Found %d seed files. Starting execution...\n\n", len(sqlFiles))

	for _, fileName := range sqlFiles {
		filePath := filepath.Join(seedsDir, fileName)
		fmt.Printf("Executing: %s... ", fileName)

		content, err := os.ReadFile(filePath)
		if err != nil {
			log.Fatalf("\nFailed to read file %s: %v", fileName, err)
		}

		// Execute the SQL file content
		_, err = db.Exec(string(content))
		if err != nil {
			log.Fatalf("\nError executing %s: %v", fileName, err)
		}

		fmt.Println("SUCCESS")
	}

	fmt.Println("\nAll seed files executed successfully!")
}
