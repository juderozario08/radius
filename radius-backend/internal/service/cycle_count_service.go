package service

import (
	"context"
	"errors"
	"fmt"
	"radius/internal/cache"
	"radius/internal/models"
	"time"

	"github.com/redis/go-redis/v9"
)

type CycleCountService struct {
	cycleCountRepo CycleCountRepository
	employeeRepo   EmployeeRepository
	storeRepo      StoreRepository
	productsRepo   ProductRepository
	inventoryRepo  InventoryRepository
	sessionRepo    SessionRepository
	broadcaster    EventBroadcaster
	redisClient    *redis.Client
}

func NewCycleCountService(
	cycleCountRepo CycleCountRepository,
	employeeRepo EmployeeRepository,
	storeRepo StoreRepository,
	productsRepo ProductRepository,
	inventoryRepo InventoryRepository,
	sessionRepo SessionRepository,
	broadcaster ...EventBroadcaster,
) *CycleCountService {
	svc := &CycleCountService{
		cycleCountRepo: cycleCountRepo,
		employeeRepo:   employeeRepo,
		storeRepo:      storeRepo,
		productsRepo:   productsRepo,
		inventoryRepo:  inventoryRepo,
		sessionRepo:    sessionRepo,
	}
	if len(broadcaster) > 0 && broadcaster[0] != nil {
		svc.broadcaster = broadcaster[0]
	}
	return svc
}

func (s *CycleCountService) SetRedisClient(redisClient *redis.Client) {
	s.redisClient = redisClient
}

func (s *CycleCountService) invalidateStoreOperations(ctx context.Context, storeID int) {
	if s.redisClient != nil && storeID > 0 {
		cache.InvalidateStoreOperations(ctx, s.redisClient, storeID)
	}
}

func (s *CycleCountService) SetBroadcaster(broadcaster EventBroadcaster) {
	s.broadcaster = broadcaster
}

func (s *CycleCountService) GetWeeklyCycleCounts(ctx context.Context, storeId int, role models.EmployeeRole, storeIDOverride *int) ([]models.CycleCountSummary, error) {
	if role == models.RoleAdmin {
		if storeIDOverride != nil {
			return s.cycleCountRepo.GetWeeklyCycleCounts(ctx, *storeIDOverride)
		}
		return s.cycleCountRepo.GetWeeklyCycleCounts(ctx, 0)
	}

	return s.cycleCountRepo.GetWeeklyCycleCounts(ctx, storeId)
}

func (s *CycleCountService) GetCycleCountDetail(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, countID int) (*models.CycleCountDetailResponse, error) {
	targetStoreID := storeId
	if role == models.RoleAdmin {
		targetStoreID = 0
	}

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, countID, targetStoreID)
	if err != nil {
		return nil, err
	}
	if count == nil {
		return nil, fmt.Errorf("cycle count %d not found", countID)
	}

	if count.CountedBy == nil && role != models.RoleAdmin {
		updatedCount, err := s.cycleCountRepo.AutoAssignCycleCount(ctx, countID, count.StoreId, employeeId)
		if err != nil {
			return nil, err
		}
		if updatedCount != nil {
			count = updatedCount
		}
	} else if count.CountedBy != nil && *count.CountedBy != employeeId {
		if role != models.RoleManager && role != models.RoleAdmin {
			assignee := "another employee"
			if count.CountedByName != nil && *count.CountedByName != "" {
				assignee = *count.CountedByName
			}
			return nil, fmt.Errorf("cycle count is currently assigned to %s and is in progress", assignee)
		}
	}

	items, err := s.cycleCountRepo.GetCycleCountItems(ctx, countID)
	if err != nil {
		return nil, err
	}

	return &models.CycleCountDetailResponse{
		Count: *count,
		Items: items,
	}, nil
}

func (s *CycleCountService) GetCycleCountItems(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, countID int) ([]models.CycleCountItemDetail, error) {
	targetStoreID := storeId
	if role == models.RoleAdmin {
		targetStoreID = 0
	}

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, countID, targetStoreID)
	if err != nil {
		return nil, err
	}
	if count == nil {
		return nil, fmt.Errorf("cycle count %d not found", countID)
	}

	if count.CountedBy != nil && *count.CountedBy != employeeId {
		if role != models.RoleManager && role != models.RoleAdmin {
			assignee := "another employee"
			if count.CountedByName != nil && *count.CountedByName != "" {
				assignee = *count.CountedByName
			}
			return nil, fmt.Errorf("cycle count is currently assigned to %s and is in progress", assignee)
		}
	}

	return s.cycleCountRepo.GetCycleCountItems(ctx, countID)
}

func (s *CycleCountService) StartCount(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, categoryID int, storeIDOverride ...*int) (*models.CycleCount, error) {
	targetStoreID := storeId
	if len(storeIDOverride) > 0 && storeIDOverride[0] != nil && *storeIDOverride[0] > 0 && role == models.RoleAdmin {
		targetStoreID = *storeIDOverride[0]
	}

	count, err := s.cycleCountRepo.StartCycleCount(ctx, targetStoreID, categoryID, employeeId)
	if err != nil {
		return nil, err
	}

	if s.broadcaster != nil && count != nil {
		payload := models.CycleCountUpdatedPayload{
			CountId:           count.CountId,
			StoreId:           count.StoreId,
			CategoryId:        count.CategoryId,
			CategoryName:      count.CategoryName,
			Status:            string(count.Status),
			Action:            "started",
			TotalItems:        count.TotalItems,
			CountedItems:      count.CountedItems,
			TotalVarianceCost: count.TotalVarianceCost,
			UpdatedAt:         time.Now().UTC(),
		}
		s.broadcaster.BroadcastToStore(count.StoreId, models.WebSocketEvent{
			Type:      models.EventCycleCountUpdated,
			StoreId:   count.StoreId,
			Timestamp: time.Now().UTC(),
			Payload:   payload,
		})
	}

	if count != nil {
		s.invalidateStoreOperations(ctx, count.StoreId)
	}

	return count, nil
}

func (s *CycleCountService) RecordScan(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, req models.RecordScanRequest) (*models.CycleCountItemDetail, error) {
	targetStoreID := storeId
	if role == models.RoleAdmin {
		targetStoreID = 0
	}

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, req.CountId, targetStoreID)
	if err != nil {
		return nil, err
	}
	if count == nil {
		return nil, fmt.Errorf("cycle count %d not found", req.CountId)
	}

	if count.CountedBy != nil && *count.CountedBy != employeeId {
		if role != models.RoleManager && role != models.RoleAdmin {
			assignee := "another employee"
			if count.CountedByName != nil && *count.CountedByName != "" {
				assignee = *count.CountedByName
			}
			return nil, fmt.Errorf("cycle count is currently assigned to %s and is in progress", assignee)
		}
	}

	item, err := s.cycleCountRepo.RecordScan(ctx, count.StoreId, req, employeeId)
	if err != nil {
		return nil, err
	}

	if s.broadcaster != nil {
		statusStr := string(count.Status)
		if count.Status == models.CycleCountStatusNotStarted {
			statusStr = string(models.CycleCountStatusInProgress)
		}

		payload := models.CycleCountUpdatedPayload{
			CountId:           count.CountId,
			StoreId:           count.StoreId,
			CategoryId:        count.CategoryId,
			CategoryName:      count.CategoryName,
			Status:            statusStr,
			Action:            "scanned",
			TotalItems:        count.TotalItems,
			CountedItems:      count.CountedItems,
			TotalVarianceCost: count.TotalVarianceCost,
			UpdatedAt:         time.Now().UTC(),
		}

		if item != nil {
			if item.ExpectedQty == 0 && item.CountedQty > 0 {
				payload.TotalItems = count.TotalItems + 1
			}
			if count.CountedItems < payload.TotalItems {
				payload.CountedItems = count.CountedItems + 1
			}
			payload.TotalVarianceCost = count.TotalVarianceCost + item.VarianceCost
		}

		s.broadcaster.BroadcastToStore(count.StoreId, models.WebSocketEvent{
			Type:      models.EventCycleCountUpdated,
			StoreId:   count.StoreId,
			Timestamp: time.Now().UTC(),
			Payload:   payload,
		})
	}

	return item, nil
}

func (s *CycleCountService) SubmitForApproval(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, req models.SubmitCycleCountRequest) error {
	targetStoreID := storeId
	if role == models.RoleAdmin {
		targetStoreID = 0
	}

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, req.CountId, targetStoreID)
	if err != nil {
		return err
	}
	if count == nil {
		return fmt.Errorf("cycle count %d not found", req.CountId)
	}

	if count.CountedBy != nil && *count.CountedBy != employeeId {
		if role != models.RoleManager && role != models.RoleAdmin {
			assignee := "another employee"
			if count.CountedByName != nil && *count.CountedByName != "" {
				assignee = *count.CountedByName
			}
			return fmt.Errorf("cycle count is currently assigned to %s and is in progress", assignee)
		}
	}

	err = s.cycleCountRepo.SubmitForApproval(ctx, count.StoreId, req.CountId, req.Notes)
	if err != nil {
		return err
	}

	if s.broadcaster != nil {
		payload := models.CycleCountUpdatedPayload{
			CountId:           count.CountId,
			StoreId:           count.StoreId,
			CategoryId:        count.CategoryId,
			CategoryName:      count.CategoryName,
			Status:            string(models.CycleCountStatusPendingApproval),
			Action:            "submitted",
			TotalItems:        count.TotalItems,
			CountedItems:      count.CountedItems,
			TotalVarianceCost: count.TotalVarianceCost,
			UpdatedAt:         time.Now().UTC(),
		}
		s.broadcaster.BroadcastToStore(count.StoreId, models.WebSocketEvent{
			Type:      models.EventCycleCountUpdated,
			StoreId:   count.StoreId,
			Timestamp: time.Now().UTC(),
			Payload:   payload,
		})
	}

	if count != nil {
		s.invalidateStoreOperations(ctx, count.StoreId)
	}

	return nil
}

func (s *CycleCountService) ApproveCount(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, req models.ApproveCycleCountRequest) error {
	if role != models.RoleManager && role != models.RoleAdmin {
		return errors.New("unauthorized: only managers and admins can approve cycle counts")
	}

	storeID := storeId
	if role == models.RoleAdmin {
		count, err := s.cycleCountRepo.GetCycleCountByID(ctx, req.CountId, 0)
		if err != nil {
			return err
		}
		if count == nil {
			return fmt.Errorf("cycle count %d not found", req.CountId)
		}
		storeID = count.StoreId
	}

	err := s.cycleCountRepo.ApproveCycleCount(ctx, storeID, req.CountId, employeeId)
	if err != nil {
		return err
	}

	if s.broadcaster != nil {
		count, _ := s.cycleCountRepo.GetCycleCountByID(ctx, req.CountId, storeID)
		payload := models.CycleCountUpdatedPayload{
			CountId:   req.CountId,
			StoreId:   storeID,
			Status:    string(models.CycleCountStatusApproved),
			Action:    "approved",
			UpdatedAt: time.Now().UTC(),
		}
		if count != nil {
			payload.CategoryId = count.CategoryId
			payload.CategoryName = count.CategoryName
			payload.TotalItems = count.TotalItems
			payload.CountedItems = count.CountedItems
			payload.TotalVarianceCost = count.TotalVarianceCost
		}
		s.broadcaster.BroadcastToStore(storeID, models.WebSocketEvent{
			Type:      models.EventCycleCountUpdated,
			StoreId:   storeID,
			Timestamp: time.Now().UTC(),
			Payload:   payload,
		})
	}

	s.invalidateStoreOperations(ctx, storeID)

	return nil
}

func (s *CycleCountService) TransferOwnership(ctx context.Context, storeId int, role models.EmployeeRole, req models.TransferCycleCountOwnershipRequest) error {
	if role != models.RoleManager && role != models.RoleAdmin {
		return errors.New("unauthorized: only managers and admins can transfer cycle count ownership")
	}

	targetStoreID := storeId
	if role == models.RoleAdmin {
		targetStoreID = 0
	}

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, req.CountId, targetStoreID)
	if err != nil {
		return err
	}
	if count == nil {
		return fmt.Errorf("cycle count %d not found", req.CountId)
	}

	targetEmployee, err := s.employeeRepo.GetEmployeeById(ctx, req.EmployeeId)
	if err != nil {
		return err
	}
	if targetEmployee == nil || targetEmployee.StoreId != count.StoreId || (targetEmployee.IsTerminated != nil && *targetEmployee.IsTerminated) || (targetEmployee.IsActive != nil && !*targetEmployee.IsActive) {
		return errors.New("target employee not found or not active in this store")
	}

	err = s.cycleCountRepo.TransferOwnership(ctx, count.StoreId, req.CountId, req.EmployeeId)
	if err != nil {
		return err
	}

	if s.broadcaster != nil {
		payload := models.CycleCountUpdatedPayload{
			CountId:           count.CountId,
			StoreId:           count.StoreId,
			CategoryId:        count.CategoryId,
			CategoryName:      count.CategoryName,
			Status:            string(count.Status),
			Action:            "transferred",
			TotalItems:        count.TotalItems,
			CountedItems:      count.CountedItems,
			TotalVarianceCost: count.TotalVarianceCost,
			UpdatedAt:         time.Now().UTC(),
		}
		s.broadcaster.BroadcastToStore(count.StoreId, models.WebSocketEvent{
			Type:      models.EventCycleCountUpdated,
			StoreId:   count.StoreId,
			Timestamp: time.Now().UTC(),
			Payload:   payload,
		})
	}

	return nil
}

func (s *CycleCountService) SearchCycleCounts(ctx context.Context, storeId int, role models.EmployeeRole, criteria models.CycleCountSearchCriteria) ([]models.CycleCountSummary, error) {
	targetStoreID := storeId
	if role == models.RoleAdmin {
		if criteria.StoreId != nil && *criteria.StoreId > 0 {
			targetStoreID = *criteria.StoreId
		} else {
			targetStoreID = 0
		}
	}

	return s.cycleCountRepo.SearchCycleCounts(ctx, targetStoreID, criteria)
}

func (s *CycleCountService) GetSchedule(ctx context.Context, storeId int, role models.EmployeeRole, fromStr, toStr string, storeIDOverride ...*int) ([]models.CycleCountScheduleEntry, error) {
	targetStoreID := storeId
	if role == models.RoleAdmin {
		if len(storeIDOverride) > 0 && storeIDOverride[0] != nil && *storeIDOverride[0] > 0 {
			targetStoreID = *storeIDOverride[0]
		} else {
			targetStoreID = 0
		}
	}

	var fromDate, toDate time.Time
	if fromStr != "" {
		parsedFrom, err := time.Parse("2006-01-02", fromStr)
		if err == nil {
			fromDate = parsedFrom
		}
	}
	if fromDate.IsZero() {
		now := time.Now()
		fromDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	}

	if toStr != "" {
		parsedTo, err := time.Parse("2006-01-02", toStr)
		if err == nil {
			toDate = parsedTo
		}
	}
	if toDate.IsZero() {
		toDate = fromDate.AddDate(0, 2, 0)
	}

	return s.cycleCountRepo.GetSchedule(ctx, targetStoreID, fromDate, toDate)
}

func (s *CycleCountService) CreateScheduleEntry(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, req models.CreateScheduleRequest) (*models.CycleCountScheduleEntry, error) {
	if role != models.RoleManager && role != models.RoleAdmin {
		return nil, errors.New("unauthorized: only managers and admins can schedule cycle counts")
	}

	scheduledDate, err := time.Parse("2006-01-02", req.ScheduledDate)
	if err != nil {
		return nil, fmt.Errorf("invalid date format, expected YYYY-MM-DD: %w", err)
	}

	targetStoreID := storeId
	if req.StoreId != nil && *req.StoreId > 0 && role == models.RoleAdmin {
		targetStoreID = *req.StoreId
	}

	return s.cycleCountRepo.CreateScheduleEntry(ctx, targetStoreID, req.CategoryId, scheduledDate, employeeId)
}
