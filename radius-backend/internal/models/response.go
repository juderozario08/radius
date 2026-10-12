package models

type APIError struct {
	Error     string `json:"error"`
	RequestID string `json:"request_id,omitempty"`
}

type APIMessage struct {
	Message string `json:"message"`
}
