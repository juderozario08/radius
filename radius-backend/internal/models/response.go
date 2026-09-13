package models

type APIError struct {
	Error string `json:"error"`
}

type APIMessage struct {
	Message string `json:"message"`
}
