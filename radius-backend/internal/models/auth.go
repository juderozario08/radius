// radius-backend/internal/models/auth.go
package models

type EmployeeLoginRequest struct {
	Email    string `json:"email"     binding:"required,email"`
	Password string `json:"password"  binding:"required,min=8"`
	Force    bool   `json:"force"`
}

type EmployeeLoginResponse struct {
	Token        string       `json:"token"`
	RefreshToken string       `json:"refresh_token"`
	SessionId    int          `json:"session_id"`
	EmployeeId   int          `json:"employee_id"`
	LastName     string       `json:"last_name"`
	Role         EmployeeRole `json:"role"`
	StoreId      int          `json:"store_id"`
}

type LoginResult struct {
	RequiresConfirmation bool                   `json:"requires_confirmation"`
	Session              *EmployeeLoginResponse `json:"session,omitempty"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type RefreshTokenResponse struct {
	Token string `json:"token"`
}
