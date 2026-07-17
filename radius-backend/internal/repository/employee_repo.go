package repository

import (
	"context"
	"database/sql"
	"errors"
	"radius/internal/models"
)

type EmployeeRepo struct {
	db *sql.DB
}

func NewEmployeeRepo(db *sql.DB) *EmployeeRepo {
	return &EmployeeRepo{db: db}
}

func (r *EmployeeRepo) GetEmployeeByEmail(ctx context.Context, email string) (*models.Employee, error) {
	var employee models.Employee
	query := `
		SELECT
			e.employee_id, e.email, e.password_hash, e.store_id,
			e.first_name, e.last_name, e.role, e.phone, e.address,
			e.city, e.province, e.postal_code, e.is_active
		FROM employees as e
		WHERE e.email = $1;
	`
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&employee.EmployeeId, &employee.Email, &employee.PasswordHash,
		&employee.StoreId, &employee.FirstName, &employee.LastName, &employee.Role,
		&employee.Phone, &employee.Address, &employee.City,
		&employee.Province, &employee.PostalCode, &employee.IsActive,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &employee, nil
}

func (r *EmployeeRepo) GetEmployeeByEmailWithSession(ctx context.Context, email string) (*models.GetEmployeeByEmailWithSession, error) {
	var employee models.GetEmployeeByEmailWithSession
	query := `
		SELECT
			s.session_id,
			e.employee_id, e.email, e.password_hash, e.store_id,
			e.first_name, e.last_name, e.role, e.phone, e.address,
			e.city, e.province, e.postal_code, e.is_active
		FROM employees as e
		LEFT JOIN sessions as s
			ON s.employee_id = e.employee_id
			AND s.expires_at > NOW()
		WHERE e.email = $1;
	`
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&employee.SessionId,
		&employee.EmployeeId, &employee.Email, &employee.PasswordHash,
		&employee.StoreId, &employee.FirstName, &employee.LastName, &employee.Role,
		&employee.Phone, &employee.Address, &employee.City,
		&employee.Province, &employee.PostalCode, &employee.IsActive,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &employee, nil
}

func (r *EmployeeRepo) GetEmployeeById(ctx context.Context, id int) (*models.Employee, error) {
	return nil, nil
}

func (r *EmployeeRepo) GetAllEmployees(ctx context.Context) ([]models.Employee, error) {
	query := `
		SELECT
			employee_id,
			store_id,
			first_name,
			last_name,
			email,
			role,
			phone,
			address,
			city,
			province,
			postal_code,
			is_active
		FROM employees;
    `
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var employees []models.Employee
	for rows.Next() {
		var e models.Employee
		err := rows.Scan(
			&e.EmployeeId,
			&e.StoreId,
			&e.FirstName,
			&e.LastName,
			&e.Email,
			&e.Role,
			&e.Phone,
			&e.Address,
			&e.City,
			&e.Province,
			&e.PostalCode,
			&e.IsActive,
		)
		if err != nil {
			return nil, err
		}
		employees = append(employees, e)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return employees, nil
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
