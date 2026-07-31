// radius-backend/internal/repository/session_repo.go
package repository

import (
	"context"
	"database/sql"
	"radius/internal/models"
	"time"
)

type SessionRepo struct {
	db *sql.DB
}

func NewSessionRepo(db *sql.DB) *SessionRepo {
	return &SessionRepo{db: db}
}

func (r *SessionRepo) GetSessionByAccessTokenHash(ctx context.Context, accessTokenHash string) (*models.GetSessionByHashedToken, error) {
	var session models.GetSessionByHashedToken
	query := `
		SELECT s.session_id, e.employee_id, s.expires_at, e.store_id, e.is_active, e.is_terminated FROM sessions as s
		JOIN employees as e ON e.employee_id = s.employee_id
		WHERE access_token_hash = $1;
    `
	err := r.db.QueryRowContext(ctx, query, accessTokenHash).Scan(
		&session.SessionId, &session.EmployeeId, &session.ExpiresAt, &session.StoreId, &session.IsActive, &session.IsTerminated,
	)
	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (r *SessionRepo) GetSessionByRefreshTokenHash(ctx context.Context, refreshTokenHash string) (*models.GetSessionByHashedToken, error) {
	var session models.GetSessionByHashedToken
	query := `
		SELECT s.session_id, e.employee_id, s.expires_at, e.store_id, e.is_active, e.is_terminated FROM sessions as s
		JOIN employees as e ON e.employee_id = s.employee_id
		WHERE refresh_token_hash = $1;
    `
	err := r.db.QueryRowContext(ctx, query, refreshTokenHash).Scan(
		&session.SessionId, &session.EmployeeId, &session.ExpiresAt, &session.StoreId, &session.IsActive, &session.IsTerminated,
	)
	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (r *SessionRepo) GetSessionById(ctx context.Context, id int) (*models.Session, error) {
	var session models.Session
	query := `
		SELECT session_id, employee_id, store_id, access_token_hash
		FROM sessions
		WHERE session_id = $1
	`
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&session.SessionId, &session.EmployeeId, &session.StoreId, &session.AccessTokenHash,
	)
	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (r *SessionRepo) TerminateSessionById(ctx context.Context, id int) error {
	query := `DELETE FROM sessions WHERE session_id = $1;`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *SessionRepo) TerminateSessionByAccessTokenHash(ctx context.Context, accessTokenHash string) error {
	query := `DELETE FROM sessions WHERE access_token_hash = $1;`
	_, err := r.db.ExecContext(ctx, query, accessTokenHash)
	return err
}

func (r *SessionRepo) UpdateAccessTokenHash(ctx context.Context, sessionId int, newAccessTokenHash string) error {
	query := `UPDATE sessions SET access_token_hash = $1 WHERE session_id = $2;`
	_, err := r.db.ExecContext(ctx, query, newAccessTokenHash, sessionId)
	return err
}

func (r *SessionRepo) UpdateSessionExpiry(ctx context.Context, sessionId int, newExpiresAt time.Time) error {
	query := `UPDATE sessions SET expires_at = $1 WHERE session_id = $2;`
	_, err := r.db.ExecContext(ctx, query, newExpiresAt, sessionId)
	return err
}

func (r *SessionRepo) CreateSession(ctx context.Context, model models.CreateSessionRequest) (*models.CreateSessionResponse, error) {
	var session models.CreateSessionResponse
	query := `
		INSERT INTO sessions (employee_id, access_token_hash, refresh_token_hash, ip_address, expires_at, store_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING session_id, employee_id, store_id;
	`
	err := r.db.QueryRowContext(
		ctx, query, model.EmployeeId, model.AccessTokenHash, model.RefreshTokenHash,
		model.IpAddress.String(), model.ExpiresAt, model.StoreId,
	).Scan(&session.SessionId, &session.EmployeeId, &session.StoreId)
	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (r *SessionRepo) GetAllSessions(ctx context.Context, limit, offset int) ([]models.GetAllSessions, int, error) {
	var totalLength int
	countQuery := `
		SELECT COUNT(*)
		FROM sessions
		INNER JOIN employees
			ON employees.employee_id = sessions.employee_id;
	`
	err := r.db.QueryRowContext(ctx, countQuery).Scan(&totalLength)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT
			sessions.session_id,
			sessions.ip_address,
			employees.employee_id,
			employees.store_id,
			employees.first_name,
			employees.last_name,
			employees.email,
			employees.role,
			employees.phone,
			employees.address,
			employees.city,
			employees.province,
			employees.postal_code,
			employees.is_active
		FROM sessions
		INNER JOIN employees
			ON employees.employee_id = sessions.employee_id
		LIMIT $1 OFFSET $2;
    `
	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var sessions []models.GetAllSessions
	for rows.Next() {
		var s models.GetAllSessions
		err := rows.Scan(
			&s.SessionId,
			&s.IpAddress,
			&s.EmployeeId,
			&s.StoreId,
			&s.FirstName,
			&s.LastName,
			&s.Email,
			&s.Role,
			&s.Phone,
			&s.Address,
			&s.City,
			&s.Province,
			&s.PostalCode,
			&s.IsActive,
		)
		if err != nil {
			return nil, 0, err
		}
		sessions = append(sessions, s)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, err
	}

	return sessions, totalLength, nil
}

func (r *SessionRepo) TerminateExpiredSessions(ctx context.Context) (int64, error) {
	query := `DELETE FROM sessions WHERE expires_at < NOW()`

	result, err := r.db.ExecContext(ctx, query)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}
