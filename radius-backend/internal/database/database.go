package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database"
	_ "github.com/golang-migrate/migrate/v4/database/multistmt"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
)

type DB struct {
	*sql.DB
}

func ConnectDB() (*DB, error) {
	connectionString := os.Getenv("DATABASE_URL")
	if connectionString == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable not set\n")
	}

	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, err
	}

	err = db.Ping()
	if err != nil {
		return nil, err
	}

	log.Println("Successfully connected to Postgres Database")
	return &DB{db}, nil
}

func (d *DB) RunMigrations(migrationsPath string) error {
	log.Println("Running database migrations...")

	driver, err := postgres.WithInstance(d.DB, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("Creating migration driver: %w\n", err)
	}

	m, err := migrate.NewWithDatabaseInstance("file://"+migrationsPath, "postgres", driver)
	if err != nil {
		return fmt.Errorf("Loading migration files: %w\n", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("Error running migrations: %w\n", err)
	}

	return nil
}
