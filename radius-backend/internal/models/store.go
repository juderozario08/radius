//radius-backend/internal/models/store.go
package models

import "time"

type StoreBase struct {
	Name       string `json:"name"        binding:"required"`
	Address    string `json:"address"     binding:"required"`
	City       string `json:"city"        binding:"required"`
	Province   string `json:"province"    binding:"required"`
	PostalCode string `json:"postal_code" binding:"required"`
	Phone      string `json:"phone"       binding:"required"`
	Timezone   string `json:"timezone"    binding:"required"`
	IsActive   *bool  `json:"is_active"   binding:"required"`
}

type Store struct {
	StoreId   int       `json:"store_id"`
	CreatedAt time.Time `json:"created_at"`
	StoreBase
}

type CreateStoreRequest struct {
	StoreBase
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

type UpdateStoreRequest struct {
	StoreBase
}

type UpdateStoreResponse struct {
	Message string `json:"message"`
}

type CreateStoreResponse struct {
	Store   Store  `json:"store"`
	Message string `json:"message"`
}

type GetStoreResponse struct {
	Store   Store  `json:"store"`
	Message string `json:"message"`
}

type ActivateStoreResponse struct {
	Message string `json:"message"`
}

type DeactivateStoreResponse struct {
	Message string `json:"message"`
}

type ActivateStoreRequest struct {
	StoreId int `json:"store_id"`
}

type DeactivateStoreRequest struct {
	StoreId int `json:"store_id"`
}
