// radius-backend/internal/models/sessions.go
package models

import (
	"net"
	"time"
)

type Session struct {
	SessionId  int       `json:"session_id"`
	EmployeeId int       `json:"employee_id"`
	StoreId    int       `json:"store_id"`
	IpAddress  net.IP    `json:"ip_address"`
	CreatedAt  time.Time `json:"created_at"`
	ExpiresAt  time.Time `json:"expires_at"`
	TokenHash  string    `json:"-"`
}

type GetSessionByHashedToken struct {
	SessionId    int
	EmployeeId   int
	ExpiresAt    time.Time
	StoreId      int
	IsActive     *bool
	IsTerminated *bool
}

type CreateSessionRequest struct {
	EmployeeId int       `json:"employee_id"`
	TokenHash  string    `json:"-"`
	StoreId    int       `json:"store_id"`
	IpAddress  net.IP    `json:"ip_address"`
	ExpiresAt  time.Time `json:"expires_at"`
}

type CreateSessionResponse struct {
	SessionId  int `json:"session_id"`
	EmployeeId int `json:"employee_id"`
	StoreId    int `json:"store_id"`
}

type SessionsResponse struct {
	SessionId  int       `json:"session_id"`
	EmployeeId int       `json:"employee_id"`
	StoreId    int       `json:"store_id"`
	IpAddress  string    `json:"ip_address"`
	CreatedAt  time.Time `json:"created_at"`
	ExpiresAt  time.Time `json:"expires_at"`
}

type GetAllSessionsResponse struct {
	Message  string           `json:"message"`
	Sessions []GetAllSessions `json:"sessions"`
}

type GetAllSessions struct {
	SessionId  int          `json:"session_id"`
	IpAddress  string       `json:"ip_address"`
	EmployeeId int          `json:"employee_id"`
	StoreId    int          `json:"store_id"`
	FirstName  string       `json:"first_name"`
	LastName   string       `json:"last_name"`
	Email      string       `json:"email"`
	Role       EmployeeRole `json:"role"`
	Phone      string       `json:"phone"`
	Address    string       `json:"address"`
	City       string       `json:"city"`
	Province   string       `json:"province"`
	PostalCode string       `json:"postal_code"`
	IsActive   bool         `json:"is_active"`
}

type TerminateSessionResponse struct {
	Message string `json:"message"`
}
