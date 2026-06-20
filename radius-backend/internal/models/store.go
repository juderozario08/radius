package models

import "time"

type Store struct {
	StoreId    int       `json:"store_id"`
	Name       string    `json:"name"`
	Address    string    `json:"address"`
	City       string    `json:"city"`
	Province   string    `json:"province"`
	PostalCode string    `json:"postal_code"`
	Phone      string    `json:"phone"`
	Timezone   string    `json:"timezone"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
}

type EmployeeRole string

const (
	RoleSales   EmployeeRole = "SALES"
	RoleService EmployeeRole = "SERVICE"
	RoleManager EmployeeRole = "MANAGER"
	RoleAdmin   EmployeeRole = "ADMIN"
)

type Employee struct {
	EmployeeId   int          `json:"employee_id"`
	Email        string       `json:"email"`
	StoreId      int          `json:"store_id"`
	FirstName    string       `json:"first_name"`
	LastName     string       `json:"last_name"`
	Role         EmployeeRole `json:"role"`
	PasswordHash string       `json:"password_hash"`
	Phone        string       `json:"phone"`
	Address      string       `json:"address"`
	City         string       `json:"city"`
	Province     string       `json:"province"`
	PostalCode   string       `json:"postal_code"`
	IsActive     bool         `json:"is_active"`
}
