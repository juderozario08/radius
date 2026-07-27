// radius-backend/internal/repository/orders_repo.go
package repository

import "database/sql"

type OrdersRepo struct {
	db *sql.DB
}

func NewOrdersRepo(db *sql.DB) *OrdersRepo {
	return &OrdersRepo{db: db}
}
