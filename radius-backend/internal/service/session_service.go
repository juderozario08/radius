package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"radius/internal/models"
	"radius/internal/utils"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type SessionService struct {
	sessionRepo SessionRepository
	jwtSecret   []byte
}

func NewSessionService(sessionRepo SessionRepository, jwtSecret []byte) *SessionService {
	return &SessionService{
		sessionRepo: sessionRepo,
		jwtSecret:   jwtSecret,
	}
}

func (s *SessionService) CreateSession(ctx context.Context, employeeId int, role models.EmployeeRole, email string, ipAddress string, storeId int) (string, string, int, error) {
	accessToken, err := utils.GenerateAccessToken(employeeId, email, role, s.jwtSecret)
	if err != nil {
		return "", "", -1, err
	}
	refreshToken, err := utils.GenerateRefreshToken(employeeId, email, role, s.jwtSecret)
	if err != nil {
		return "", "", -1, err
	}

	accessTokenHash := utils.HashTokenForDB(accessToken)
	refreshTokenHash := utils.HashTokenForDB(refreshToken)
	expiresAt := time.Now().Add(utils.SessionInactivityTimeout)

	session, err := s.sessionRepo.CreateSession(ctx, models.CreateSessionRequest{
		EmployeeId:       employeeId,
		StoreId:          storeId,
		IpAddress:        net.ParseIP(ipAddress),
		AccessTokenHash:  accessTokenHash,
		RefreshTokenHash: refreshTokenHash,
		ExpiresAt:        expiresAt,
	})
	if err != nil {
		return "", "", -1, err
	}
	return accessToken, refreshToken, session.SessionId, nil
}

func (s *SessionService) ValidateSession(ctx context.Context, tokenString string) error {
	hashedToken := utils.HashTokenForDB(tokenString)
	session, err := s.sessionRepo.GetSessionByAccessTokenHash(ctx, hashedToken)
	if err != nil {
		return errors.New("Session not found or logged out")
	}
	if time.Now().After(session.ExpiresAt) {
		_ = s.sessionRepo.TerminateSessionByAccessTokenHash(ctx, hashedToken)
		return errors.New("Session expired and has been removed")
	}
	if session.IsActive != nil && !(*session.IsActive) {
		_ = s.sessionRepo.TerminateSessionByAccessTokenHash(ctx, hashedToken)
		return errors.New("Inactive account")
	}
	if session.IsTerminated != nil && *session.IsTerminated {
		_ = s.sessionRepo.TerminateSessionByAccessTokenHash(ctx, hashedToken)
		return errors.New("Terminated Account")
	}
	return nil
}

func (s *SessionService) RefreshAccessToken(ctx context.Context, refreshTokenString string) (string, error) {
	// Parse and validate the refresh JWT
	token, err := jwt.Parse(refreshTokenString, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return "", errors.New("invalid or expired refresh token")
	}
	if !token.Valid {
		return "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("could not extract claims from refresh token")
	}

	// Ensure this is actually a refresh token, not an access token
	tokenType, ok := claims["token_type"]
	if !ok || tokenType != "refresh" {
		return "", errors.New("invalid token type: expected refresh token")
	}

	// Look up the session by refresh token hash
	refreshTokenHash := utils.HashTokenForDB(refreshTokenString)
	session, err := s.sessionRepo.GetSessionByRefreshTokenHash(ctx, refreshTokenHash)
	if err != nil {
		return "", errors.New("session not found or already logged out")
	}

	// Check session expiry (tied to refresh token lifetime)
	if time.Now().After(session.ExpiresAt) {
		_ = s.sessionRepo.TerminateSessionById(ctx, session.SessionId)
		return "", errors.New("session expired")
	}

	// Check employee status
	if session.IsActive != nil && !(*session.IsActive) {
		_ = s.sessionRepo.TerminateSessionById(ctx, session.SessionId)
		return "", errors.New("inactive account")
	}
	if session.IsTerminated != nil && *session.IsTerminated {
		_ = s.sessionRepo.TerminateSessionById(ctx, session.SessionId)
		return "", errors.New("terminated account")
	}

	// Extract claims for new access token
	employeeId := int(claims["employee_id"].(float64))
	email := claims["email"].(string)
	role := models.EmployeeRole(claims["role"].(string))

	// Generate new access token
	newAccessToken, err := utils.GenerateAccessToken(employeeId, email, role, s.jwtSecret)
	if err != nil {
		return "", errors.New("failed to generate new access token")
	}

	// Update the access token hash in the database
	newAccessTokenHash := utils.HashTokenForDB(newAccessToken)
	if err := s.sessionRepo.UpdateAccessTokenHash(ctx, session.SessionId, newAccessTokenHash); err != nil {
		return "", errors.New("failed to update session")
	}

	// Sliding window: extend session expiry so active users are never kicked out
	newExpiry := time.Now().Add(utils.SessionInactivityTimeout)
	if err := s.sessionRepo.UpdateSessionExpiry(ctx, session.SessionId, newExpiry); err != nil {
		return "", errors.New("failed to extend session")
	}

	return newAccessToken, nil
}

func (s *SessionService) Logout(ctx context.Context, tokenString string) error {
	hashedToken := utils.HashTokenForDB(tokenString)
	return s.sessionRepo.TerminateSessionByAccessTokenHash(ctx, hashedToken)
}

func (s *SessionService) TerminateSessionById(ctx context.Context, sessionId int) (*models.APIMessage, error) {
	if err := s.sessionRepo.TerminateSessionById(ctx, sessionId); err != nil {
		return nil, err
	}
	return &models.APIMessage{Message: "Session deleted successfully"}, nil
}

func (s *SessionService) GetAllSessions(ctx context.Context, pageNumber int, pageSize int) (*models.GetAllSessionsResponse, error) {
	limit := pageSize
	offset := (pageNumber - 1) * pageSize

	sessions, totalLength, err := s.sessionRepo.GetAllSessions(ctx, limit, offset)
	if err != nil {
		return nil, err
	}
	return &models.GetAllSessionsResponse{
		Sessions:    sessions,
		TotalLength: totalLength,
		Message:     "Retrieved all existing sessions",
	}, nil
}

func (s *SessionService) StartSessionCleanupWorker(ctx context.Context, interval time.Duration) {
	cleanup := func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[Worker] panic recovered: %v", r)
			}
		}()
		cctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()
		rowsDeleted, err := s.sessionRepo.TerminateExpiredSessions(cctx)
		if err != nil {
			log.Printf("[Worker] Error cleaning up expired sessions: %v", err)
		} else if rowsDeleted > 0 {
			log.Printf("[Worker] cleaned up %d sessions", rowsDeleted)
		}
	}
	go func() {
		log.Println("[Worker] Running initial session cleanup...")
		cleanup()
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				cleanup()
			case <-ctx.Done():
				log.Println("[Worker] Stopping session cleanup worker")
				return
			}
		}
	}()
}
