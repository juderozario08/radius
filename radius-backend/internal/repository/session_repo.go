package repository

import (
	"context"
	"database/sql"
	"errors"
	"radius/internal/models"
)

type SessionRepo struct {
	db *sql.DB
}

func NewSessionRepo(db *sql.DB) *SessionRepo {
	return &SessionRepo{db: db}
}

func (r *SessionRepo) GetSessionByHashedToken(ctx context.Context, tokenHash string) (*models.Session, error) {
	var session models.Session
	query := `
		SELECT session_id, employee_id, store_id, token_hash
		FROM sessions
		WHERE token_hash = $1
	`
	err := r.db.QueryRowContext(ctx, query, tokenHash).Scan(
		&session.SessionId, &session.EmployeeId, &session.StoreId, &session.TokenHash,
	)
	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (r *SessionRepo) GetSessionById(ctx context.Context, id int) (*models.Session, error) {
	var session models.Session
	query := `
		SELECT session_id, employee_id, store_id, token_hash
		FROM sessions
		WHERE session_id = $1
	`
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&session.SessionId, &session.EmployeeId, &session.StoreId, &session.TokenHash,
	)
	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (r *SessionRepo) DeleteSessionById(ctx context.Context, id int) error {
	query := `DELETE FROM sessions WHERE session_id = $1;`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("No session found with that ID")
	}

	return nil
}

func (r *SessionRepo) DeleteSessionByHashedToken(ctx context.Context, tokenHash string) error {
	query := `DELETE FROM sessions WHERE token_hash = $1;`
	result, err := r.db.ExecContext(ctx, query, tokenHash)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.New("No session found with that token")
	}

	return nil
}

func (r *SessionRepo) CreateSession(ctx context.Context, model models.CreateSessionRequest) (*models.CreateSessionResponse, error) {
	var session models.CreateSessionResponse
	query := `
		INSERT INTO sessions (employee_id, token_hash, ip_address, expires_at, store_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING session_id, employee_id, store_id;
	`
	err := r.db.QueryRowContext(
		ctx, query, model.EmployeeId, model.TokenHash,
		model.IpAddress.String(), model.ExpiresAt, model.StoreId,
	).Scan(&session.SessionId, &session.EmployeeId, &session.StoreId)
	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (r *SessionRepo) GetAllSessions(ctx context.Context) ([]models.Session, error) {
	query := `
        SELECT session_id, employee_id, store_id, ip_address, created_at, expires_at
        FROM sessions;
    `
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []models.Session
	for rows.Next() {
		var s models.Session
		err := rows.Scan(
			&s.SessionId,
			&s.EmployeeId,
			&s.StoreId,
			&s.IpAddress,
			&s.CreatedAt,
			&s.ExpiresAt,
		)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return sessions, nil
}
