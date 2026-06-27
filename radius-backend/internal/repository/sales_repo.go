package repository

import "database/sql"

type SalesRepo struct {
	DB *sql.DB
}

func NewSalesRepo(db *sql.DB) *SalesRepo {
	return &SalesRepo{DB: db}
}

func CreateTransaction(db *sql.DB) {
}

func GetTransactionByID(db *sql.DB, id int) {
}

func GetProductTransactions(db *sql.DB, sku int) {
}
