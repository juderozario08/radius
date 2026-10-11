package service_test

import (
	"context"
	"errors"
	"radius/internal/cache"
	"radius/internal/models"
	"radius/internal/service"
	"radius/internal/service/mocks"
	"radius/internal/utils"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"go.uber.org/mock/gomock"
)

func TestAuthService_Authenticate(t *testing.T) {
	secret := []byte("test-secret-for-authenticate-32-bytes")
	access := func(t *testing.T) string {
		token, err := utils.GenerateAccessToken(7, "claims@example.invalid", models.RoleAdmin, 1, secret)
		if err != nil {
			t.Fatal(err)
		}
		return token
	}
	signed := func(method jwt.SigningMethod, key any, claims jwt.MapClaims) func(*testing.T) string {
		return func(t *testing.T) string {
			token, err := jwt.NewWithClaims(method, claims).SignedString(key)
			if err != nil {
				t.Fatal(err)
			}
			return token
		}
	}
	validClaims := func() jwt.MapClaims {
		return jwt.MapClaims{"employee_id": 7, "email": "claims@example.invalid", "role": "ADMIN", "store_id": 1, "token_type": "access", "exp": time.Now().Add(time.Minute).Unix()}
	}
	withClaim := func(key string, value any) jwt.MapClaims {
		claims := validClaims()
		if value == nil {
			delete(claims, key)
		} else {
			claims[key] = value
		}
		return claims
	}
	employee := func(role models.EmployeeRole, storeID int, active, terminated bool) *models.Employee {
		return &models.Employee{EmployeeId: 7, EmployeeBase: models.EmployeeBase{Role: role, StoreId: storeID, IsActive: &active, IsTerminated: &terminated}}
	}
	activeSession := func() *models.GetSessionByHashedToken {
		active, terminated := true, false
		return &models.GetSessionByHashedToken{SessionId: 3, ExpiresAt: time.Now().Add(time.Hour), IsActive: &active, IsTerminated: &terminated}
	}

	for _, tc := range []struct {
		name     string
		token    func(*testing.T) string
		session  bool
		revoked  bool
		employee *models.Employee
		want     *models.AuthContext
		wantErr  error
	}{
		{name: "valid access token uses DB role and store", token: access, session: true, employee: employee(models.RoleSales, 4, true, false), want: &models.AuthContext{EmployeeId: 7, Email: "claims@example.invalid", Role: models.RoleSales, StoreId: 4}},
		{name: "refresh token rejected", token: func(t *testing.T) string {
			token, _ := utils.GenerateRefreshToken(7, "claims@example.invalid", models.RoleAdmin, 1, secret)
			return token
		}, wantErr: service.ErrInvalidToken},
		{name: "missing token type rejected", token: signed(jwt.SigningMethodHS256, secret, withClaim("token_type", nil)), wantErr: service.ErrInvalidToken},
		{name: "HS512 rejected", token: signed(jwt.SigningMethodHS512, secret, validClaims()), wantErr: service.ErrInvalidToken},
		{name: "none algorithm rejected", token: signed(jwt.SigningMethodNone, jwt.UnsafeAllowNoneSignatureType, validClaims()), wantErr: service.ErrInvalidToken},
		{name: "wrong secret rejected", token: signed(jwt.SigningMethodHS256, []byte("another-secret-entirely-32-bytes!!"), validClaims()), wantErr: service.ErrInvalidToken},
		{name: "expired rejected", token: signed(jwt.SigningMethodHS256, secret, withClaim("exp", time.Now().Add(-time.Minute).Unix())), wantErr: service.ErrInvalidToken},
		{name: "malformed rejected", token: func(*testing.T) string { return "not-a-jwt" }, wantErr: service.ErrInvalidToken},
		{name: "missing employee_id rejected", token: signed(jwt.SigningMethodHS256, secret, withClaim("employee_id", nil)), wantErr: service.ErrInvalidToken},
		{name: "string employee_id rejected", token: signed(jwt.SigningMethodHS256, secret, withClaim("employee_id", "7")), wantErr: service.ErrInvalidToken},
		{name: "fractional employee_id rejected", token: signed(jwt.SigningMethodHS256, secret, withClaim("employee_id", 7.5)), wantErr: service.ErrInvalidToken},
		{name: "missing session rejected", token: access, wantErr: service.ErrInvalidToken},
		{name: "revoked session rejected", token: access, revoked: true, wantErr: service.ErrInvalidToken},
		{name: "unknown employee rejected", token: access, session: true, wantErr: service.ErrInvalidToken},
		{name: "terminated employee rejected", token: access, session: true, employee: employee(models.RoleAdmin, 1, true, true), wantErr: service.ErrAccountTerminated},
		{name: "inactive employee rejected", token: access, session: true, employee: employee(models.RoleAdmin, 1, false, false), wantErr: service.ErrAccountInactive},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			sessions := mocks.NewMockSessionRepository(ctrl)
			employees := mocks.NewMockEmployeeRepository(ctrl)
			mr := miniredis.RunT(t)
			rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
			t.Cleanup(func() { _ = rdb.Close() })

			token := tc.token(t)
			switch {
			case tc.revoked:
				mr.Set(cache.AuthTokenKey(utils.HashTokenForDB(token)), "3")
				mr.Set("radius:auth:revoked:3", "1")
			case tc.session:
				sessions.EXPECT().GetSessionByAccessTokenHash(gomock.Any(), utils.HashTokenForDB(token)).Return(activeSession(), nil)
				employees.EXPECT().GetEmployeeById(gomock.Any(), 7).Return(tc.employee, nil)
			default:
				sessions.EXPECT().GetSessionByAccessTokenHash(gomock.Any(), gomock.Any()).Return(nil, errors.New("no rows")).MaxTimes(1)
			}

			auth := service.NewAuthService(employees, service.NewSessionService(sessions, secret, rdb))
			got, err := auth.Authenticate(context.Background(), token)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("err = %v, want %v", err, tc.wantErr)
				}
				if got != nil {
					t.Fatalf("expected nil auth context, got %+v", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if *got != *tc.want {
				t.Fatalf("auth context = %+v, want %+v", *got, *tc.want)
			}
		})
	}
}
