package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	GinMode        string
	IsRelease      bool
	JWTSecretKey   []byte
	Port           string
	DatabaseURL    string
	RedisURL       string
	AllowedOrigins string
}

func LoadConfig() (*Config, error) {
	ginMode := os.Getenv("GIN_MODE")
	isRelease := ginMode == "release"

	if !isRelease {
		err := godotenv.Load()
		if err != nil {
			log.Printf("Error loading .env file: %v", err)
		} else {
			log.Println("Loaded local .env file successfully")
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
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	return cfg, nil
}
