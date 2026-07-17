//radius-backend/internal/repository/product_repo.go
package repository

import "database/sql"

type ProductRepo struct {
	db *sql.DB
}

func NewProductRepo(db *sql.DB) *ProductRepo {
	return &ProductRepo{db: db}
}
