package service

import (
	"errors"
	"radius/internal/api"
)

var (
	ErrForbidden    = api.ErrForbidden
	ErrNotFound     = api.ErrNotFound
	ErrConflict     = api.ErrConflict
	ErrValidation   = api.ErrValidation
	ErrUnauthorized = errors.New("unauthorized")
)
