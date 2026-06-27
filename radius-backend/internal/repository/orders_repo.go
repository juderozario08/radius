package repository

import "database/sql"

type OrdersRepo struct {
	DB *sql.DB
}

func NewOrdersRepo(db *sql.DB) *OrdersRepo {
	return &OrdersRepo{DB: db}
}
