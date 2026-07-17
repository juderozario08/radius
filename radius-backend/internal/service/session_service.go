//radius-backend/internal/service/session_service.go
package service

import (
	"context"
	"log"
	"radius/internal/models"
	"radius/internal/repository"
	"time"
)

type SessionService struct {
	employeeRepo *repository.EmployeeRepo
	sessionRepo  *repository.SessionRepo
	jwtSecret    []byte
}

func NewSessionService(employeeRepo *repository.EmployeeRepo, sessionRepo *repository.SessionRepo, jwtSecret []byte) *SessionService {
	return &SessionService{
		employeeRepo: employeeRepo,
		sessionRepo:  sessionRepo,
		jwtSecret:    jwtSecret,
	}
}

func (s *SessionService) StartSessionCleanupWorker(ctx context.Context, interval time.Duration) {
	cleanup := func() {
		rowsDeleted, err := s.sessionRepo.DeleteExpiredSessions(ctx)
		if err != nil {
			log.Printf("[Worker] Error cleaning up expired sessions: %v", err)
		} else if rowsDeleted > 0 {
			log.Printf("[Worker] Successfully cleaned up %d expired orphaned sessions", rowsDeleted)
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

func (s *SessionService) GetAllSessions(ctx context.Context) (*models.GetAllSessionsResponse, error) {
	sessions, err := s.sessionRepo.GetAllSessions(ctx)
	if err != nil {
		return nil, err
	}

	return &models.GetAllSessionsResponse{
		Sessions: sessions,
		Message:  "Retrieved all existing sessions",
	}, nil
}
