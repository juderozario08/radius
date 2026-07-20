// radius-backend/internal/repository/employee_repo.go
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
			e.city, e.province, e.postal_code, e.is_active, e.is_terminated
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
		&employee.Province, &employee.PostalCode, &employee.IsActive, &employee.IsTerminated,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &employee, nil
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
			is_active,
			is_terminated
		FROM employees
		ORDER BY employee_id ASC;
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
			&e.IsTerminated,
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
		INSERT INTO employees (email, store_id, first_name, last_name, role, password_hash, phone, address, city, province, postal_code, is_active, is_terminated)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING employee_id, store_id, first_name, last_name, role
	`
	err := r.db.QueryRowContext(
		ctx, query, model.Email, model.StoreId,
		model.FirstName, model.LastName, model.Role, model.PasswordHash, model.Phone,
		model.Address, model.City, model.Province, model.PostalCode, model.IsActive, model.IsTerminated,
	).Scan(
		&employee.EmployeeId, &employee.StoreId,
		&employee.FirstName, &employee.LastName, &employee.Role,
	)
	if err != nil {
		return nil, err
	}
	return &employee, nil
}

func (r *EmployeeRepo) TerminateEmployeeById(ctx context.Context, id int) error {
	query := `UPDATE employees SET is_terminated = TRUE, is_active = FALSE WHERE employee_id = $1;`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *EmployeeRepo) ActivateEmployeeById(ctx context.Context, id int) error {
	query := `UPDATE employees SET is_terminated = FALSE WHERE employee_id = $1;`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *EmployeeRepo) UpdateEmployee(ctx context.Context, body models.Employee) error {
	query := `
        UPDATE employees SET
            email = $1,
            store_id = $2,
            first_name = $3,
            last_name = $4,
            role = $5,
            phone = $6,
            address = $7,
            city = $8,
            province = $9,
            postal_code = $10,
            is_active = $11,
            is_terminated = $12
        WHERE employee_id = $13
    `

	res, err := r.db.ExecContext(
		ctx, query,
		body.Email, body.StoreId, body.FirstName, body.LastName,
		body.Role, body.Phone, body.Address, body.City, body.Province,
		body.PostalCode, body.IsActive, body.IsTerminated,
		body.EmployeeId,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("No employee found with the provided ID")
	}

	return nil
}
