package repository

import "database/sql"

type ProductRepo struct {
	DB *sql.DB
}

func NewProductRepo(db *sql.DB) *ProductRepo {
	return &ProductRepo{DB: db}
}
