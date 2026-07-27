// radius-backend/internal/repository/sales_repo.go
package repository

import (
	"context"
	"database/sql"
)

type SalesRepo struct {
	db *sql.DB
}

func NewSalesRepo(db *sql.DB) *SalesRepo {
	return &SalesRepo{db: db}
}

func (r *SalesRepo) CreateTransaction(ctx context.Context) {
}

func (r *SalesRepo) GetTransactionByID(ctx context.Context, id int) {
}

func (r *SalesRepo) GetProductTransactions(ctx context.Context, sku int) {
}
