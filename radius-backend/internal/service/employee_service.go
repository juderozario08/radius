package service

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"radius/internal/cache"
	"radius/internal/database"
	"radius/internal/models"
	"radius/internal/utils"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

type EmployeeService struct {
	employeeRepo   EmployeeRepository
	sessionService *SessionService
	redisClient    *redis.Client
	sfGroup        singleflight.Group
}

func NewEmployeeService(employeeRepo EmployeeRepository, sessionService *SessionService, redisClient ...*redis.Client) *EmployeeService {
	svc := &EmployeeService{
		employeeRepo:   employeeRepo,
		sessionService: sessionService,
	}
	if len(redisClient) > 0 && redisClient[0] != nil {
		svc.redisClient = redisClient[0]
	}
	return svc
}

func (e *EmployeeService) InvalidateEmployeeCache(ctx context.Context, employeeId int) {
	if e.redisClient == nil {
		return
	}
	cacheKey := cache.EmployeeKey(employeeId)
	if err := e.redisClient.Del(ctx, cacheKey).Err(); err != nil && !errors.Is(err, redis.Nil) {
		database.CacheMetrics.RecordDeleteError()
		log.Printf("[WARN] Failed to invalidate employee cache %s: %v", cacheKey, err)
	}
}

func (e *EmployeeService) GetEmployeeContext(ctx context.Context, employeeId int) (*models.EmployeeContext, error) {
	cacheKey := cache.EmployeeKey(employeeId)
	if e.redisClient != nil {
		val, err := e.redisClient.Get(ctx, cacheKey).Result()
		if err == nil {
			var empCtx models.EmployeeContext
			if jsonErr := json.Unmarshal([]byte(val), &empCtx); jsonErr == nil {
				database.CacheMetrics.RecordHit()
				return &empCtx, nil
			}
			database.CacheMetrics.RecordSerializationFailure()
			_ = e.redisClient.Del(ctx, cacheKey).Err()
		} else if !errors.Is(err, redis.Nil) {
			database.CacheMetrics.RecordFallback()
		}
	}

	database.CacheMetrics.RecordMiss()

	val, err, _ := e.sfGroup.Do(cacheKey, func() (any, error) {
		emp, dbErr := e.employeeRepo.GetEmployeeById(ctx, employeeId)
		if dbErr != nil {
			return nil, dbErr
		}
		if emp == nil {
			return nil, errors.New("employee not found")
		}

		isActive := emp.IsActive != nil && *emp.IsActive
		isTerminated := emp.IsTerminated != nil && *emp.IsTerminated

		empCtx := &models.EmployeeContext{
			EmployeeId:   emp.EmployeeId,
			Role:         emp.Role,
			StoreId:      emp.StoreId,
			IsActive:     isActive,
			IsTerminated: isTerminated,
		}

		if e.redisClient != nil {
			if data, mErr := json.Marshal(empCtx); mErr == nil {
				ttl := cache.ApplyJitter(15*time.Minute, 2*time.Minute)
				if setErr := e.redisClient.Set(ctx, cacheKey, data, ttl).Err(); setErr != nil {
					database.CacheMetrics.RecordSetError()
				}
			} else {
				database.CacheMetrics.RecordSerializationFailure()
			}
		}

		return empCtx, nil
	})

	if err != nil {
		return nil, err
	}
	return val.(*models.EmployeeContext), nil
}

func (e *EmployeeService) GetAllEmployees(ctx context.Context, pageNumber int, pageSize int, storeId *int) (*models.GetAllEmployeesResponse, error) {
	limit := pageSize
	offset := (pageNumber - 1) * pageSize

	employees, totalLength, err := e.employeeRepo.GetAllEmployees(ctx, limit, offset, storeId)
	if err != nil {
		return nil, err
	}

	return &models.GetAllEmployeesResponse{
		Employees:   employees,
		TotalLength: totalLength,
		Message:     "Retrieved all existing employees",
	}, nil
}

func (e *EmployeeService) GetManagerEmployees(ctx context.Context, storeId int, role models.EmployeeRole, pageNumber int, pageSize int, storeIDOverride ...*int) (*models.GetAllEmployeesResponse, error) {
	limit := pageSize
	offset := (pageNumber - 1) * pageSize

	targetStoreID := &storeId
	if len(storeIDOverride) > 0 && storeIDOverride[0] != nil && *storeIDOverride[0] > 0 && role == models.RoleAdmin {
		targetStoreID = storeIDOverride[0]
	}

	employees, totalLength, err := e.employeeRepo.GetAllEmployees(ctx, limit, offset, targetStoreID)
	if err != nil {
		return nil, err
	}

	return &models.GetAllEmployeesResponse{
		Employees:   employees,
		TotalLength: totalLength,
		Message:     "Retrieved store employees",
	}, nil
}

func (e *EmployeeService) TerminateEmployee(ctx context.Context, employeeId int) (*models.APIMessage, error) {
	err := e.employeeRepo.TerminateEmployeeById(ctx, employeeId)
	if err != nil {
		return nil, err
	}

	if e.sessionService != nil {
		e.sessionService.TerminateAllSessionsByEmployeeId(ctx, employeeId)
	}
	e.InvalidateEmployeeCache(ctx, employeeId)

	return &models.APIMessage{
		Message: "Employee Terminated Successfully",
	}, nil
}

func (e *EmployeeService) ActivateEmployee(ctx context.Context, employeeId int) (*models.APIMessage, error) {
	err := e.employeeRepo.ActivateEmployeeById(ctx, employeeId)
	if err != nil {
		return nil, err
	}
	e.InvalidateEmployeeCache(ctx, employeeId)
	return &models.APIMessage{
		Message: "Employee Activated Successfully",
	}, nil
}

func (e *EmployeeService) UpdateEmployee(ctx context.Context, body models.Employee) (*models.APIMessage, error) {
	if body.IsTerminated != nil && body.IsActive != nil {
		if *body.IsTerminated && *body.IsActive {
			return nil, errors.New("An employee cannot be active while being terminated")
		}
	}

	province, postalCode, err := utils.SanitizeLocation(body.Province, body.PostalCode)
	if err != nil {
		return nil, err
	}
	body.Province = province
	body.PostalCode = postalCode

	isBeingDeactivated := (body.IsTerminated != nil && *body.IsTerminated) || (body.IsActive != nil && !*body.IsActive)

	err = e.employeeRepo.UpdateEmployee(ctx, body)
	if err != nil {
		log.Println("Error: " + err.Error())
		return nil, errors.New("error updating this employee")
	}

	if isBeingDeactivated && e.sessionService != nil {
		e.sessionService.TerminateAllSessionsByEmployeeId(ctx, body.EmployeeId)
	}
	e.InvalidateEmployeeCache(ctx, body.EmployeeId)

	return &models.APIMessage{
		Message: "Updated employee successfully!",
	}, nil
}

func (e *EmployeeService) CreateEmployee(ctx context.Context, model models.CreateEmployeeRequest) (*models.CreateEmployeeResponse, error) {
	normalizedProvince, normalizedPostal, err := utils.SanitizeLocation(model.Province, model.PostalCode)
	if err != nil {
		return nil, err
	}
	model.PostalCode = normalizedPostal
	model.Province = normalizedProvince

	hash, err := utils.HashPassword(model.Password)
	if err != nil {
		return nil, err
	}

	employee, err := e.employeeRepo.CreateEmployee(ctx, models.CreateEmployeeRow{
		PasswordHash: hash,
		EmployeeBase: models.EmployeeBase{
			Email:        strings.ToLower(model.Email),
			StoreId:      model.StoreId,
			FirstName:    model.FirstName,
			LastName:     model.LastName,
			Role:         model.Role,
			Phone:        model.Phone,
			Address:      model.Address,
			City:         model.City,
			Province:     model.Province,
			PostalCode:   model.PostalCode,
			IsActive:     model.IsActive,
			IsTerminated: model.IsTerminated,
		},
	})
	if err != nil {
		return nil, err
	}

	return employee, nil
}
