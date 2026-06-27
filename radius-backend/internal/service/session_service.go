package service

import (
	"context"
	"radius/internal/models"
	"radius/internal/repository"
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

func (s *SessionService) GetAllSessions(ctx context.Context) (*models.GetAllSessionsResponse, error) {
	sessions, err := s.sessionRepo.GetAllSessions(ctx)
	if err != nil {
		return nil, err
	}

	var sessionResponse []models.SessionsResponse
	for _, s := range sessions {
		sessionResponse = append(sessionResponse, models.SessionsResponse{
			SessionId:  s.SessionId,
			EmployeeId: s.EmployeeId,
			StoreId:    s.StoreId,
			IpAddress:  s.IpAddress.String(),
			CreatedAt:  s.CreatedAt,
			ExpiresAt:  s.ExpiresAt,
		})
	}

	return &models.GetAllSessionsResponse{
		Sessions: sessionResponse,
		Message:  "Retrieved all existing sessions",
	}, nil
}
