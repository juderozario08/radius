package main

import (
	"fmt"
	"log/slog"
	"os"
	"radius/internal/config"
	"radius/internal/database"
	"radius/internal/logging"
)

func main() {
	logging.Setup(os.Getenv("GIN_MODE"), os.Getenv("LOG_LEVEL"))
	if err := run(); err != nil {
		slog.Error("migrations failed", "error", err)
		os.Exit(1)
	}
	slog.Info("migrations applied successfully")
}

func run() error {
	cfg, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	logging.Setup(cfg.GinMode, cfg.LogLevel)

	db, err := database.ConnectDB(cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}
	defer db.Close()

	if err := db.RunMigrations("migrations"); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	return nil
}
