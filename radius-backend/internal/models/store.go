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
	EmployeeId int          `json:"employee_id" binding:"required"`
	Email      string       `json:"email"       binding:"required,email"`
	StoreId    int          `json:"store_id"    binding:"required"`
	FirstName  string       `json:"first_name"  binding:"required"`
	LastName   string       `json:"last_name"   binding:"required"`
	Role       EmployeeRole `json:"role"        binding:"required"`
	Phone      string       `json:"phone"       binding:"required"`
	Address    string       `json:"address"     binding:"required"`
	City       string       `json:"city"        binding:"required"`
	Province   string       `json:"province"    binding:"required"`
	PostalCode string       `json:"postal_code" binding:"required"`
	IsActive   bool         `json:"is_active"`
}

type EmployeeWithPassword struct {
	EmployeeId   int          `json:"employee_id"   binding:"required"`
	Email        string       `json:"email"         binding:"required,email"`
	PasswordHash string       `json:"password_hash" binding:"required"`
	StoreId      int          `json:"store_id"      binding:"required"`
	FirstName    string       `json:"first_name"    binding:"required"`
	LastName     string       `json:"last_name"     binding:"required"`
	Role         EmployeeRole `json:"role"          binding:"required"`
	Phone        string       `json:"phone"         binding:"required"`
	Address      string       `json:"address"       binding:"required"`
	City         string       `json:"city"          binding:"required"`
	Province     string       `json:"province"      binding:"required"`
	PostalCode   string       `json:"postal_code"   binding:"required"`
	IsActive     bool         `json:"is_active"`
}

type CreateEmployeeRequest struct {
	Email           string       `json:"email"            binding:"required,email"`
	StoreId         int          `json:"store_id"         binding:"required"`
	FirstName       string       `json:"first_name"       binding:"required"`
	LastName        string       `json:"last_name"        binding:"required"`
	Role            EmployeeRole `json:"role"             binding:"required"`
	Password        string       `json:"password"         binding:"required,min=8"`
	ConfirmPassword string       `json:"confirm_password" binding:"required"`
	Phone           string       `json:"phone"            binding:"required"`
	Address         string       `json:"address"          binding:"required"`
	City            string       `json:"city"             binding:"required"`
	Province        string       `json:"province"         binding:"required"`
	PostalCode      string       `json:"postal_code"      binding:"required"`
	IsActive        bool         `json:"is_active"`
}

type CreateEmployeeResponse struct {
	EmployeeId int    `json:"employee_id" binding:"required"`
	FirstName  string `json:"first_name"  binding:"required"`
	LastName   string `json:"last_name"   binding:"required"`
	StoreId    string `json:"store_id"    binding:"required"`
	Role       string `json:"role"        binding:"required"`
}

type CreateEmployeeRow struct {
	Email        string       `json:"email"`
	StoreId      int          `json:"store_id"`
	FirstName    string       `json:"first_name"`
	LastName     string       `json:"last_name"`
	Role         EmployeeRole `json:"role"`
	PasswordHash string       `json:"-"`
	Phone        string       `json:"phone"`
	Address      string       `json:"address"`
	City         string       `json:"city"`
	Province     string       `json:"province"`
	PostalCode   string       `json:"postal_code"`
	IsActive     bool         `json:"is_active"`
}

type EmployeeLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type EmployeeLoginResponse struct {
	Token      string       `json:"token"`
	EmployeeId int          `json:"employee_id"`
	LastName   string       `json:"last_name"`
	Role       EmployeeRole `json:"role"`
	StoreId    int          `json:"store_id"`
}
