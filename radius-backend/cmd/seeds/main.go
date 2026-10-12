package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

func main() {
	allowWipe := flag.Bool("i-understand-this-wipes-data", false, "allow destructive seed wipe")
	flag.Parse()
	if strings.EqualFold(os.Getenv("GIN_MODE"), "release") && os.Getenv("ALLOW_SEED_WIPE") != "true" {
		slog.Error("refusing to run seeds in release mode without ALLOW_SEED_WIPE=true")
		os.Exit(1)
	}
	if !*allowWipe && os.Getenv("ALLOW_SEED_WIPE") != "true" {
		slog.Error("refusing to run destructive seeds without --i-understand-this-wipes-data or ALLOW_SEED_WIPE=true")
		os.Exit(1)
	}
	err := godotenv.Load(".env")
	if err != nil {
		slog.Info("no .env file found, relying on existing environment variables")
	}

	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		slog.Error("DATABASE_URL is not set in the environment")
		os.Exit(1)
	}

	fmt.Println("Running Python seed generator...")
	cmd := exec.Command("python3", "seeds/generate_all.py")
	if _, err := os.Stat("venv/bin/python3"); err == nil {
		cmd = exec.Command("venv/bin/python3", "seeds/generate_all.py")
	}
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		slog.Error("failed to run python generator", "error", err)
		os.Exit(1)
	}

	db, err := sql.Open("pgx", dbUrl)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		slog.Error("failed to ping database", "error", err)
		os.Exit(1)
	}
	fmt.Println("Successfully connected to Postgres Database.")

	seedsDir := "seeds"
	files, err := os.ReadDir(seedsDir)
	if err != nil {
		slog.Error("failed to read seeds directory", "error", err)
		os.Exit(1)
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
			slog.Error("failed to read file", "file", fileName, "error", err)
			os.Exit(1)
		}

		_, err = db.Exec(string(content))
		if err != nil {
			slog.Error("error executing seed file", "file", fileName, "error", err)
			os.Exit(1)
		}

		fmt.Println("SUCCESS")

		if err := os.Remove(filePath); err != nil {
			slog.Warn("failed to delete seed file", "file", filePath, "error", err)
		}
	}

	fmt.Println("\nAll seed files executed and cleaned up successfully!")
}
