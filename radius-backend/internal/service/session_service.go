package service

import (
	"context"
	"errors"
	"log"
	"net"
	"radius/internal/models"
	"radius/internal/repository"
	"radius/internal/utils"
	"time"
)

type SessionService struct {
	sessionRepo *repository.SessionRepo
	jwtSecret   []byte
}

func NewSessionService(sessionRepo *repository.SessionRepo, jwtSecret []byte) *SessionService {
	return &SessionService{
		sessionRepo: sessionRepo,
		jwtSecret:   jwtSecret,
	}
}

func (s *SessionService) CreateSession(ctx context.Context, employeeId int, role models.EmployeeRole, email string, ipAddress string, storeId int) (string, int, error) {
	token, err := utils.GenerateToken(employeeId, email, role, s.jwtSecret)
	if err != nil {
		return "", -1, err
	}
	tokenHash := utils.HashTokenForDB(token)
	expiresAt := time.Now().Add(time.Hour * 24)

	session, err := s.sessionRepo.CreateSession(ctx, models.CreateSessionRequest{
		EmployeeId: employeeId,
		StoreId:    storeId,
		IpAddress:  net.ParseIP(ipAddress),
		TokenHash:  tokenHash,
		ExpiresAt:  expiresAt,
	})
	if err != nil {
		return "", -1, err
	}
	return token, session.SessionId, nil
}

func (s *SessionService) ValidateSession(ctx context.Context, tokenString string) error {
	hashedToken := utils.HashTokenForDB(tokenString)
	session, err := s.sessionRepo.GetSessionByHashedToken(ctx, hashedToken)
	if err != nil {
		return errors.New("Session not found or logged out")
	}
	if time.Now().After(session.ExpiresAt) {
		_ = s.sessionRepo.TerminateSessionByHashedToken(ctx, hashedToken)
		return errors.New("Session expired and has been removed")
	}
	return nil
}

func (s *SessionService) Logout(ctx context.Context, tokenString string) error {
	hashedToken := utils.HashTokenForDB(tokenString)
	return s.sessionRepo.TerminateSessionByHashedToken(ctx, hashedToken)
}

func (s *SessionService) TerminateSessionById(ctx context.Context, sessionId int) (*models.TerminateSessionResponse, error) {
	if err := s.sessionRepo.TerminateSessionById(ctx, sessionId); err != nil {
		return nil, err
	}
	return &models.TerminateSessionResponse{Message: "Session deleted successfully"}, nil
}

func (s *SessionService) GetAllSessions(ctx context.Context) (*models.GetAllSessionsResponse, error) {
	sessions, err := s.sessionRepo.GetAllSessions(ctx)
	if err != nil {
		return nil, err
	}
	return &models.GetAllSessionsResponse{Sessions: sessions, Message: "Retrieved all existing sessions"}, nil
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
