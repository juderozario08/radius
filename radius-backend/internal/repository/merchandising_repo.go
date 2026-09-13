package repository

import "database/sql"

type MerchandisingRepo struct {
	db *sql.DB
}

func NewMerchandisingRepo(db *sql.DB) *MerchandisingRepo {
	return &MerchandisingRepo{db: db}
}
