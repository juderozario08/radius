package models

import (
	"net"
	"time"
)

type Session struct {
	SessionId  int        `json:"session_id"`
	EmployeeId int        `json:"employee_id"`
	TokenHash  string     `json:"token_hash"`
	IpAddress  net.IP     `json:"ip_address"`
	CreatedAt  time.Time  `json:"created_at"`
	ExpiresAt  *time.Time `json:"expires_at"`
}
