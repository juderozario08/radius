//radius-backend/internal/repository/merchandising_repo.go
package repository

import "database/sql"

type MerchandisingRepo struct {
	DB *sql.DB
}

func NewMerchandisingRepo(db *sql.DB) *MerchandisingRepo {
	return &MerchandisingRepo{DB: db}
}
