package models

import (
	"net"
	"time"
)

type Session struct {
	SessionId  int       `json:"session_id"`
	EmployeeId int       `json:"employee_id"`
	StoreId    int       `json:"store_id"`
	TokenHash  string    `json:"token_hash"`
	IpAddress  net.IP    `json:"ip_address"`
	CreatedAt  time.Time `json:"created_at"`
	ExpiresAt  time.Time `json:"expires_at"`
}

type CreateSessionRequest struct {
	EmployeeId int       `json:"employee_id"`
	TokenHash  string    `json:"token_hash"`
	StoreId    int       `json:"store_id"`
	IpAddress  net.IP    `json:"ip_address"`
	ExpiresAt  time.Time `json:"expires_at"`
}

type CreateSessionResponse struct {
	SessionId  int `json:"session_id"`
	EmployeeId int `json:"employee_id"`
	StoreId    int `json:"store_id"`
}
