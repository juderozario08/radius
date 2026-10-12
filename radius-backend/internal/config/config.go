package config

import (
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

const minJWTSecretLength = 32

type Config struct {
	GinMode        string
	IsRelease      bool
	JWTSecretKey   []byte
	Port           string
	DatabaseURL    string
	RedisURL       string
	AllowedOrigins string
	RunMigrations  bool
	LogLevel       string
}

func LoadConfig() (*Config, error) {
	ginMode := os.Getenv("GIN_MODE")
	isRelease := ginMode == "release"

	if !isRelease {
		switch err := godotenv.Load(); {
		case err == nil:
			slog.Info("loaded local .env file")
		case errors.Is(err, fs.ErrNotExist):
			slog.Debug("no .env file found, using process environment")
		default:
			slog.Warn("failed to load .env file", "error", err)
		}
	}

	cfg := &Config{
		GinMode:        ginMode,
		IsRelease:      isRelease,
		JWTSecretKey:   []byte(os.Getenv("JWT_SECRET_KEY")),
		Port:           os.Getenv("PORT"),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		RedisURL:       os.Getenv("REDIS_URL"),
		AllowedOrigins: os.Getenv("ALLOWED_ORIGINS"),
		RunMigrations:  !isRelease || os.Getenv("RUN_MIGRATIONS") == "true",
		LogLevel:       os.Getenv("LOG_LEVEL"),
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) validate() error {
	if len(c.JWTSecretKey) < minJWTSecretLength {
		return fmt.Errorf("JWT_SECRET_KEY must be at least %d bytes", minJWTSecretLength)
	}
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if c.RedisURL == "" {
		return fmt.Errorf("REDIS_URL is required")
	}
	if c.IsRelease && strings.TrimSpace(c.AllowedOrigins) == "" {
		slog.Warn("ALLOWED_ORIGINS is empty in release mode; browser origin checks are disabled (acceptable for native-only clients)")
	}
	return nil
}

func (c *Config) AllowedOriginsList() []string {
	if strings.TrimSpace(c.AllowedOrigins) == "" {
		return nil
	}
	parts := strings.Split(c.AllowedOrigins, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}
