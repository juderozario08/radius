package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"radius/internal/cache"
	"radius/internal/database"
	"radius/internal/models"
	"radius/internal/utils"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

type SessionService struct {
	sessionRepo SessionRepository
	jwtSecret   []byte
	redisClient *redis.Client
}

func NewSessionService(sessionRepo SessionRepository, jwtSecret []byte, redisClient *redis.Client) *SessionService {
	return &SessionService{
		sessionRepo: sessionRepo,
		jwtSecret:   jwtSecret,
		redisClient: redisClient,
	}
}

func (s *SessionService) GetSessionsByEmployeeId(ctx context.Context, employeeId int) ([]models.Session, error) {
	return s.sessionRepo.GetSessionsByEmployeeId(ctx, employeeId)
}

func (s *SessionService) CreateSession(ctx context.Context, employeeId int, role models.EmployeeRole, email string, ipAddress string, storeId int) (string, string, int, error) {
	existingSessions, err := s.sessionRepo.GetSessionsByEmployeeId(ctx, employeeId)
	if err == nil {
		for _, existing := range existingSessions {
			_ = s.sessionRepo.TerminateSessionById(ctx, existing.SessionId)
			if existing.AccessTokenHash != "" && s.redisClient != nil {
				_ = s.redisClient.Del(ctx, cache.AuthTokenKey(existing.AccessTokenHash), cache.LegacyAuthTokenKey(existing.AccessTokenHash)).Err()
			}
		}
	}

	accessToken, err := utils.GenerateAccessToken(employeeId, email, role, storeId, s.jwtSecret)
	if err != nil {
		return "", "", -1, err
	}
	refreshToken, err := utils.GenerateRefreshToken(employeeId, email, role, storeId, s.jwtSecret)
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

	if s.redisClient != nil {
		authKey := cache.AuthTokenKey(accessTokenHash)
		err = s.redisClient.Set(ctx, authKey, session.SessionId, utils.SessionInactivityTimeout).Err()
		if err != nil {
			database.CacheMetrics.RecordSetError()
			log.Printf("Failed to cache session in Redis: %v", err)
		}
	}

	return accessToken, refreshToken, session.SessionId, nil
}

func (s *SessionService) ValidateSession(ctx context.Context, tokenString string) error {
	hashedToken := utils.HashTokenForDB(tokenString)
	newKey := cache.AuthTokenKey(hashedToken)
	legacyKey := cache.LegacyAuthTokenKey(hashedToken)

	if s.redisClient != nil {
		cachedSessionID, err := s.redisClient.Get(ctx, newKey).Result()
		if err == nil {
			revoked, revokedErr := s.redisClient.Exists(ctx, "radius:auth:revoked:"+cachedSessionID).Result()
			if revokedErr != nil || revoked > 0 {
				return errors.New("session revoked")
			}
			database.CacheMetrics.RecordHit()
			return nil
		}
		if !errors.Is(err, redis.Nil) {
			database.CacheMetrics.RecordFallback()
		} else {
			legacyVal, legErr := s.redisClient.Get(ctx, legacyKey).Result()
			if legErr == nil {
				revoked, revokedErr := s.redisClient.Exists(ctx, "radius:auth:revoked:"+legacyVal).Result()
				if revokedErr != nil || revoked > 0 {
					return errors.New("session revoked")
				}
				database.CacheMetrics.RecordHit()
				_ = s.redisClient.Set(ctx, newKey, legacyVal, utils.SessionInactivityTimeout).Err()
				_ = s.redisClient.Del(ctx, legacyKey).Err()
				return nil
			}
		}
	}

	database.CacheMetrics.RecordMiss()

	session, err := s.sessionRepo.GetSessionByAccessTokenHash(ctx, hashedToken)
	if err != nil || session == nil {
		return errors.New("Session not found or logged out")
	}
	if s.redisClient != nil {
		revoked, revokedErr := s.redisClient.Exists(ctx, "radius:auth:revoked:"+strconv.Itoa(session.SessionId)).Result()
		if revokedErr != nil || revoked > 0 {
			return errors.New("session revoked")
		}
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

	if s.redisClient != nil {
		ttl := time.Until(session.ExpiresAt)
		if ttl > 0 {
			_ = s.redisClient.Set(ctx, newKey, session.SessionId, ttl).Err()
		}
	}
	return nil
}

func (s *SessionService) RefreshAccessToken(ctx context.Context, refreshTokenString string) (string, string, error) {
	token, err := jwt.Parse(refreshTokenString, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return "", "", errors.New("invalid or expired refresh token")
	}
	if !token.Valid {
		return "", "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", errors.New("could not extract claims from refresh token")
	}

	tokenType, ok := claims["token_type"]
	if !ok || tokenType != "refresh" {
		return "", "", errors.New("invalid token type: expected refresh token")
	}

	refreshTokenHash := utils.HashTokenForDB(refreshTokenString)
	session, err := s.sessionRepo.GetSessionByRefreshTokenHash(ctx, refreshTokenHash)
	if err != nil || session == nil {
		if s.redisClient != nil {
			sessionID, markerErr := s.redisClient.Get(ctx, "radius:auth:used-refresh:"+refreshTokenHash).Int()
			if markerErr == nil && sessionID > 0 {
				_, _ = s.TerminateSessionById(ctx, sessionID)
			}
		}
		return "", "", errors.New("session not found or already logged out")
	}

	if time.Now().After(session.ExpiresAt) {
		if session.AccessTokenHash != "" && s.redisClient != nil {
			_ = s.redisClient.Del(ctx, cache.AuthTokenKey(session.AccessTokenHash), cache.LegacyAuthTokenKey(session.AccessTokenHash)).Err()
		}
		_ = s.sessionRepo.TerminateSessionById(ctx, session.SessionId)
		return "", "", errors.New("session expired")
	}

	if session.IsActive != nil && !(*session.IsActive) {
		if session.AccessTokenHash != "" && s.redisClient != nil {
			_ = s.redisClient.Del(ctx, cache.AuthTokenKey(session.AccessTokenHash), cache.LegacyAuthTokenKey(session.AccessTokenHash)).Err()
		}
		_ = s.sessionRepo.TerminateSessionById(ctx, session.SessionId)
		return "", "", errors.New("inactive account")
	}
	if session.IsTerminated != nil && *session.IsTerminated {
		if session.AccessTokenHash != "" && s.redisClient != nil {
			_ = s.redisClient.Del(ctx, cache.AuthTokenKey(session.AccessTokenHash), cache.LegacyAuthTokenKey(session.AccessTokenHash)).Err()
		}
		_ = s.sessionRepo.TerminateSessionById(ctx, session.SessionId)
		return "", "", errors.New("terminated account")
	}

	employeeIdRaw, ok := claims["employee_id"].(float64)
	if !ok {
		return "", "", errors.New("invalid token claims")
	}
	email, ok := claims["email"].(string)
	if !ok {
		return "", "", errors.New("invalid token claims")
	}
	roleStr, ok := claims["role"].(string)
	if !ok {
		return "", "", errors.New("invalid token claims")
	}
	employeeId := int(employeeIdRaw)
	role := models.EmployeeRole(roleStr)
	storeId := session.StoreId

	newAccessToken, err := utils.GenerateAccessToken(employeeId, email, role, storeId, s.jwtSecret)
	if err != nil {
		return "", "", errors.New("failed to generate new access token")
	}

	newRefreshToken, err := utils.GenerateRefreshToken(employeeId, email, role, storeId, s.jwtSecret)
	if err != nil {
		return "", "", errors.New("failed to generate new refresh token")
	}
	newAccessHash := utils.HashTokenForDB(newAccessToken)
	newRefreshHash := utils.HashTokenForDB(newRefreshToken)
	rotated, err := s.sessionRepo.RotateSessionTokens(ctx, session.SessionId, refreshTokenHash, newAccessHash, newRefreshHash, time.Now().Add(utils.SessionInactivityTimeout))
	if err != nil {
		return "", "", errors.New("failed to rotate session")
	}
	if !rotated {
		_, _ = s.TerminateSessionById(ctx, session.SessionId)
		return "", "", errors.New("refresh token already used")
	}
	if s.redisClient == nil || s.redisClient.Set(ctx, "radius:auth:used-refresh:"+refreshTokenHash, session.SessionId, utils.MaxSessionLifetime).Err() != nil {
		_, _ = s.TerminateSessionById(ctx, session.SessionId)
		return "", "", errors.New("failed to record refresh token rotation")
	}
	if s.redisClient != nil {
		if session.AccessTokenHash != "" {
			_ = s.redisClient.Del(ctx, cache.AuthTokenKey(session.AccessTokenHash), cache.LegacyAuthTokenKey(session.AccessTokenHash)).Err()
		}
		_ = s.redisClient.Set(ctx, cache.AuthTokenKey(newAccessHash), session.SessionId, utils.SessionInactivityTimeout).Err()
	}
	return newAccessToken, newRefreshToken, nil
}

func (s *SessionService) Logout(ctx context.Context, tokenString string) error {
	hashedToken := utils.HashTokenForDB(tokenString)
	if s.redisClient != nil {
		_ = s.redisClient.Del(ctx, cache.AuthTokenKey(hashedToken), cache.LegacyAuthTokenKey(hashedToken)).Err()
	}
	return s.sessionRepo.TerminateSessionByAccessTokenHash(ctx, hashedToken)
}

func (s *SessionService) TerminateSessionById(ctx context.Context, sessionId int) (*models.APIMessage, error) {
	if s.redisClient != nil {
		_ = s.redisClient.Set(ctx, "radius:auth:revoked:"+strconv.Itoa(sessionId), "1", utils.MaxSessionLifetime).Err()
	}
	session, err := s.sessionRepo.GetSessionById(ctx, sessionId)
	if err == nil && session != nil && session.AccessTokenHash != "" && s.redisClient != nil {
		_ = s.redisClient.Del(ctx, cache.AuthTokenKey(session.AccessTokenHash), cache.LegacyAuthTokenKey(session.AccessTokenHash)).Err()
	}

	if err = s.sessionRepo.TerminateSessionById(ctx, sessionId); err != nil {
		return nil, err
	}
	return &models.APIMessage{Message: "Session deleted successfully"}, nil
}

func (s *SessionService) TerminateAllSessionsByEmployeeId(ctx context.Context, employeeId int) {
	sessions, err := s.sessionRepo.GetSessionsByEmployeeId(ctx, employeeId)
	if err != nil {
		log.Printf("Failed to fetch sessions for employee %d: %v", employeeId, err)
		return
	}
	for _, session := range sessions {
		if session.AccessTokenHash != "" && s.redisClient != nil {
			_ = s.redisClient.Del(ctx, cache.AuthTokenKey(session.AccessTokenHash), cache.LegacyAuthTokenKey(session.AccessTokenHash)).Err()
		}
		_ = s.sessionRepo.TerminateSessionById(ctx, session.SessionId)
	}
	if s.redisClient != nil {
		_ = s.redisClient.Del(ctx, cache.EmployeeKey(employeeId)).Err()
	}
}

func (s *SessionService) GetSessionIdByToken(ctx context.Context, tokenString string) (*int, error) {
	if tokenString == "" {
		return nil, nil
	}
	hashedToken := utils.HashTokenForDB(tokenString)
	newKey := cache.AuthTokenKey(hashedToken)
	legacyKey := cache.LegacyAuthTokenKey(hashedToken)

	if s.redisClient != nil {
		val, err := s.redisClient.Get(ctx, newKey).Int()
		if err == nil && val > 0 {
			database.CacheMetrics.RecordHit()
			return &val, nil
		}
		legVal, legErr := s.redisClient.Get(ctx, legacyKey).Int()
		if legErr == nil && legVal > 0 {
			database.CacheMetrics.RecordHit()
			_ = s.redisClient.Set(ctx, newKey, legVal, utils.SessionInactivityTimeout).Err()
			_ = s.redisClient.Del(ctx, legacyKey).Err()
			return &legVal, nil
		}
	}

	session, err := s.sessionRepo.GetSessionByAccessTokenHash(ctx, hashedToken)
	if err == nil && session != nil {
		return &session.SessionId, nil
	}
	return nil, nil
}

func (s *SessionService) GetAllSessions(ctx context.Context, pageNumber int, pageSize int, tokenString string) (*models.GetAllSessionsResponse, error) {
	limit := pageSize
	offset := (pageNumber - 1) * pageSize

	sessions, totalLength, err := s.sessionRepo.GetAllSessions(ctx, limit, offset)
	if err != nil {
		return nil, err
	}

	var currentSessionID *int
	if tokenString != "" {
		currentSessionID, _ = s.GetSessionIdByToken(ctx, tokenString)
	}

	if currentSessionID != nil {
		for i := range sessions {
			if sessions[i].SessionId == *currentSessionID {
				sessions[i].IsCurrent = true
			}
		}
	}

	return &models.GetAllSessionsResponse{
		Sessions:         sessions,
		TotalLength:      totalLength,
		Message:          "Retrieved all existing sessions",
		CurrentSessionId: currentSessionID,
	}, nil
}
