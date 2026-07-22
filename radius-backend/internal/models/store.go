//radius-backend/internal/models/store.go
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

type EmployeeLoginRequest struct {
	Email    string `json:"email"     binding:"required,email"`
	Password string `json:"password"  binding:"required,min=8"`
	Force    bool   `json:"force"`
}

type EmployeeLoginResponse struct {
	Token      string       `json:"token"`
	SessionId  int          `json:"session_id"`
	EmployeeId int          `json:"employee_id"`
	LastName   string       `json:"last_name"`
	Role       EmployeeRole `json:"role"`
	StoreId    int          `json:"store_id"`
}

type LoginResult struct {
	RequiresConfirmation bool                   `json:"requires_confirmation"`
	Session              *EmployeeLoginResponse `json:"session,omitempty"`
}

type GetAllStoresResponse struct {
	Stores      []Store `json:"stores"`
	TotalLength int     `json:"total_length"`
	Message     string  `json:"message"`
}

type UpdateStoreResponse struct {
	Message string `json:"message"`
}

type CreateStoreResponse struct {
	Store   Store  `json:"store"`
	Message string `json:"message"`
}

type ManageEmployeesResponse struct {
	Message string `json:"message"`
}

type GetStoreResponse struct {
	Store   Store  `json:"store"`
	Message string `json:"message"`
}
