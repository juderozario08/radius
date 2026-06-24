package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
)

type SessionRepo struct {
	DB *sql.DB
}

func NewSessionRepo(db *sql.DB) *SessionRepo {
	return &SessionRepo{DB: db}
}

func (r *EmployeeRepo) GetSessionByToken(ctx context.Context, email string) (*models.Session, error) {
	return nil, nil
}

func (r *EmployeeRepo) GetAllSessions(ctx context.Context, id int) (*models.Employee, error) {
	return nil, nil
}

func (r *SessionRepo) CreateSession(ctx context.Context, model models.CreateSessionRequest) (*models.CreateSessionResponse, error) {
	return nil, nil
}
