package repository

import "database/sql"

type StoreRepo struct {
	DB *sql.DB
}

func NewStoreRepo(db *sql.DB) *StoreRepo {
	return &StoreRepo{DB: db}
}
