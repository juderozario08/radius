package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
)

type EmployeeRepo struct {
	db *sql.DB
}

func NewEmployeeRepo(db *sql.DB) *EmployeeRepo {
	return &EmployeeRepo{db: db}
}

func (db *EmployeeRepo) GetByEmail(ctx context.Context, email string) (*models.Employee, error) {
	return nil, nil
}

func (db *EmployeeRepo) GetById(ctx context.Context, id int) (*models.Employee, error) {
	return nil, nil
}

func (db *EmployeeRepo) Create(ctx context.Context, model models.Employee) (*models.Employee, error) {
	return nil, nil
}
