// radius-backend/internal/models/employee.go
package models

type EmployeeRole string

const (
	RoleSales   EmployeeRole = "SALES"
	RoleService EmployeeRole = "SERVICE"
	RoleManager EmployeeRole = "MANAGER"
	RoleAdmin   EmployeeRole = "ADMIN"
)

type EmployeeBase struct {
	Email        string       `json:"email"         binding:"required,email"`
	StoreId      int          `json:"store_id"      binding:"required"`
	FirstName    string       `json:"first_name"    binding:"required"`
	LastName     string       `json:"last_name"     binding:"required"`
	Role         EmployeeRole `json:"role"          binding:"required"`
	Phone        string       `json:"phone"         binding:"required"`
	Address      string       `json:"address"       binding:"required"`
	City         string       `json:"city"          binding:"required"`
	Province     string       `json:"province"      binding:"required"`
	PostalCode   string       `json:"postal_code"   binding:"required"`
	IsActive     *bool        `json:"is_active"     binding:"required"`
	IsTerminated *bool        `json:"is_terminated" binding:"required"`
}

type Employee struct {
	EmployeeId   int    `json:"employee_id"`
	PasswordHash string `json:"-"`
	EmployeeBase
}

type CreateEmployeeRequest struct {
	Password string `json:"password"         binding:"required,min=8"`
	EmployeeBase
}

type CreateEmployeeRow struct {
	PasswordHash string `json:"-"`
	EmployeeBase
}

type CreateEmployeeResponse struct {
	EmployeeId int          `json:"employee_id"`
	FirstName  string       `json:"first_name"`
	LastName   string       `json:"last_name"`
	StoreId    int          `json:"store_id"`
	Role       EmployeeRole `json:"role"`
	IsActive   bool         `json:"is_active"`
}

type GetEmployeeByEmailWithSession struct {
	SessionId    *int   `json:"session_id"`
	EmployeeId   int    `json:"employee_id"`
	PasswordHash string `json:"-"`
	EmployeeBase
}

type GetAllEmployeesResponse struct {
	Employees []Employee `json:"employees"`
	Message   string     `json:"message"`
}

type TerminateEmployeeRespnose struct {
	Message string `json:"message"`
}

type ActivateEmployeeRespnose struct {
	Message string `json:"message"`
}

type UpdateEmployeeResponse struct {
	Message string `json:"message"`
}
