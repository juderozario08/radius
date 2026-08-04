// radius-backend/internal/models/response.go
package models

// APIError is the standard struct for returning HTTP error messages.
type APIError struct {
	Error string `json:"error"`
}

// APIMessage is the standard struct for returning simple success messages.
type APIMessage struct {
	Message string `json:"message"`
}
