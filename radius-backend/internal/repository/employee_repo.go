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

func (r *EmployeeRepo) GetAllEmployees(ctx context.Context) ([]*models.Employee, error) {
	return nil, nil
}

func (r *EmployeeRepo) GetByEmail(ctx context.Context, email string) (*models.Employee, error) {
	var employee models.Employee
	query := `
		SELECT employee_id, email, password_hash, store_id, first_name, last_name, role, phone, address, city, province, postal_code, is_active FROM
		employees WHERE email = $1
	`
	err := r.db.QueryRowContext(
		ctx, query, email,
	).Scan(
		&employee.EmployeeId, &employee.Email, &employee.PasswordHash,
		&employee.StoreId, &employee.FirstName, &employee.LastName, &employee.Role,
		&employee.Phone, &employee.Address, &employee.City,
		&employee.Province, &employee.PostalCode, &employee.IsActive,
	)
	if err != nil {
		return nil, err
	}
	return &employee, nil
}

func (r *EmployeeRepo) GetById(ctx context.Context, id int) (*models.Employee, error) {
	return nil, nil
}

func (r *EmployeeRepo) CreateEmployee(ctx context.Context, model models.CreateEmployeeRow) (*models.CreateEmployeeResponse, error) {
	var employee models.CreateEmployeeResponse
	query := `
		INSERT INTO employees (email, store_id, first_name, last_name, role, password_hash, phone, address, city, province, postal_code, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING employee_id, store_id, first_name, last_name, role
	`
	err := r.db.QueryRowContext(
		ctx, query, model.Email, model.StoreId,
		model.FirstName, model.LastName, model.Role, model.PasswordHash, model.Phone,
		model.Address, model.City, model.Province, model.PostalCode, model.IsActive,
	).Scan(
		&employee.EmployeeId, &employee.StoreId,
		&employee.FirstName, &employee.LastName, &employee.Role,
	)
	if err != nil {
		return nil, err
	}
	return &employee, nil
}
