package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("No .env file found, relying on existing environment variables")
	}

	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		log.Fatal("DATABASE_URL is not set in the environment")
	}

	fmt.Println("Running Python seed generator...")
	cmd := exec.Command("python3", "seeds/generate_all.py")
	if _, err := os.Stat("venv/bin/python3"); err == nil {
		cmd = exec.Command("venv/bin/python3", "seeds/generate_all.py")
	}
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		log.Fatalf("Failed to run python generator: %v", err)
	}

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

		_, err = db.Exec(string(content))
		if err != nil {
			log.Fatalf("\nError executing %s: %v", fileName, err)
		}

		fmt.Println("SUCCESS")

		if err := os.Remove(filePath); err != nil {
			log.Printf("Warning: Failed to delete %s: %v\n", filePath, err)
		}
	}

	fmt.Println("\nAll seed files executed and cleaned up successfully!")
}
