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

func (r *EmployeeRepo) GetByEmail(ctx context.Context, email string) (*models.Employee, error) {
	return nil, nil
}

func (r *EmployeeRepo) GetById(ctx context.Context, id int) (*models.Employee, error) {
	return nil, nil
}
func (r *EmployeeRepo) CreateEmployee(ctx context.Context, model models.CreateEmployee) (*models.Employee, error) {
	var employee models.Employee
	query := `
		INSERT INTO employees (email, store_id, first_name, last_name, role, password_hash, phone, address, city, province, postal_code, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING employee_id, email, store_id, first_name, last_name, role, phone, address, city, province, postal_code, is_active
	`
	err := r.db.QueryRowContext(
		ctx, query, model.Email, model.StoreId,
		model.FirstName, model.LastName, model.Role, model.PasswordHash, model.Phone,
		model.Address, model.City, model.Province, model.PostalCode, model.IsActive,
	).Scan(
		&employee.EmployeeId, &employee.Email, &employee.StoreId,
		&employee.FirstName, &employee.LastName, &employee.Role,
		&employee.Phone, &employee.Address, &employee.City,
		&employee.Province, &employee.PostalCode, &employee.IsActive,
	)
	if err != nil {
		return nil, err
	}
	return &employee, nil
}
