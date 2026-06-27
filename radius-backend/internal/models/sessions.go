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
	Message  string             `json:"message"`
	Sessions []SessionsResponse `json:"sessions"`
}
