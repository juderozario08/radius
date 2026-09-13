package service

import (
	"context"
	"errors"
	"fmt"
	"radius/internal/models"
	"time"
)

type CycleCountService struct {
	cycleCountRepo CycleCountRepository
	employeeRepo   EmployeeRepository
	storeRepo      StoreRepository
	productsRepo   ProductRepository
	inventoryRepo  InventoryRepository
	sessionRepo    SessionRepository
	broadcaster    EventBroadcaster
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

func (s *CycleCountService) SetBroadcaster(broadcaster EventBroadcaster) {
	s.broadcaster = broadcaster
}

func (s *CycleCountService) GetWeeklyCycleCounts(ctx context.Context, email string, role string, storeIDOverride *int) ([]models.CycleCountSummary, error) {
	if role == string(models.RoleAdmin) {
		if storeIDOverride != nil {
			return s.cycleCountRepo.GetWeeklyCycleCounts(ctx, *storeIDOverride)
		}
		return s.cycleCountRepo.GetWeeklyCycleCounts(ctx, 0)
	}

	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	return s.cycleCountRepo.GetWeeklyCycleCounts(ctx, employee.StoreId)
}

func (s *CycleCountService) GetCycleCountDetail(ctx context.Context, email string, countID int) (*models.CycleCountDetailResponse, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	targetStoreID := employee.StoreId
	if employee.Role == models.RoleAdmin {
		targetStoreID = 0
	}

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, countID, targetStoreID)
	if err != nil {
		return nil, err
	}
	if count == nil {
		return nil, fmt.Errorf("cycle count %d not found", countID)
	}

	if count.CountedBy == nil && employee.Role != models.RoleAdmin {
		updatedCount, err := s.cycleCountRepo.AutoAssignCycleCount(ctx, countID, count.StoreId, employee.EmployeeId)
		if err != nil {
			return nil, err
		}
		if updatedCount != nil {
			count = updatedCount
		}
	} else if count.CountedBy != nil && *count.CountedBy != employee.EmployeeId {
		if employee.Role != models.RoleManager && employee.Role != models.RoleAdmin {
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

func (s *CycleCountService) GetCycleCountItems(ctx context.Context, email string, countID int) ([]models.CycleCountItemDetail, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	targetStoreID := employee.StoreId
	if employee.Role == models.RoleAdmin {
		targetStoreID = 0
	}

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, countID, targetStoreID)
	if err != nil {
		return nil, err
	}
	if count == nil {
		return nil, fmt.Errorf("cycle count %d not found", countID)
	}

	if count.CountedBy != nil && *count.CountedBy != employee.EmployeeId {
		if employee.Role != models.RoleManager && employee.Role != models.RoleAdmin {
			assignee := "another employee"
			if count.CountedByName != nil && *count.CountedByName != "" {
				assignee = *count.CountedByName
			}
			return nil, fmt.Errorf("cycle count is currently assigned to %s and is in progress", assignee)
		}
	}

	return s.cycleCountRepo.GetCycleCountItems(ctx, countID)
}

func (s *CycleCountService) StartCount(ctx context.Context, email string, categoryID int, storeIDOverride ...*int) (*models.CycleCount, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	targetStoreID := employee.StoreId
	if len(storeIDOverride) > 0 && storeIDOverride[0] != nil && *storeIDOverride[0] > 0 && employee.Role == models.RoleAdmin {
		targetStoreID = *storeIDOverride[0]
	}

	count, err := s.cycleCountRepo.StartCycleCount(ctx, targetStoreID, categoryID, employee.EmployeeId)
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

	return count, nil
}

func (s *CycleCountService) RecordScan(ctx context.Context, email string, req models.RecordScanRequest) (*models.CycleCountItemDetail, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	targetStoreID := employee.StoreId
	if employee.Role == models.RoleAdmin {
		targetStoreID = 0
	}

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, req.CountId, targetStoreID)
	if err != nil {
		return nil, err
	}
	if count == nil {
		return nil, fmt.Errorf("cycle count %d not found", req.CountId)
	}

	if count.CountedBy != nil && *count.CountedBy != employee.EmployeeId {
		if employee.Role != models.RoleManager && employee.Role != models.RoleAdmin {
			assignee := "another employee"
			if count.CountedByName != nil && *count.CountedByName != "" {
				assignee = *count.CountedByName
			}
			return nil, fmt.Errorf("cycle count is currently assigned to %s and is in progress", assignee)
		}
	}

	item, err := s.cycleCountRepo.RecordScan(ctx, count.StoreId, req, employee.EmployeeId)
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

func (s *CycleCountService) SubmitForApproval(ctx context.Context, email string, req models.SubmitCycleCountRequest) error {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return err
	}
	if employee == nil {
		return errors.New("employee not found")
	}

	targetStoreID := employee.StoreId
	if employee.Role == models.RoleAdmin {
		targetStoreID = 0
	}

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, req.CountId, targetStoreID)
	if err != nil {
		return err
	}
	if count == nil {
		return fmt.Errorf("cycle count %d not found", req.CountId)
	}

	if count.CountedBy != nil && *count.CountedBy != employee.EmployeeId {
		if employee.Role != models.RoleManager && employee.Role != models.RoleAdmin {
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

	return nil
}

func (s *CycleCountService) ApproveCount(ctx context.Context, email string, req models.ApproveCycleCountRequest) error {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return err
	}
	if employee == nil {
		return errors.New("employee not found")
	}

	if employee.Role != models.RoleManager && employee.Role != models.RoleAdmin {
		return errors.New("unauthorized: only managers and admins can approve cycle counts")
	}

	storeID := employee.StoreId
	if employee.Role == models.RoleAdmin {
		count, err := s.cycleCountRepo.GetCycleCountByID(ctx, req.CountId, 0)
		if err != nil {
			return err
		}
		if count == nil {
			return fmt.Errorf("cycle count %d not found", req.CountId)
		}
		storeID = count.StoreId
	}

	err = s.cycleCountRepo.ApproveCycleCount(ctx, storeID, req.CountId, employee.EmployeeId)
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

	return nil
}

func (s *CycleCountService) TransferOwnership(ctx context.Context, email string, req models.TransferCycleCountOwnershipRequest) error {
	manager, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return err
	}
	if manager == nil {
		return errors.New("employee not found")
	}

	if manager.Role != models.RoleManager && manager.Role != models.RoleAdmin {
		return errors.New("unauthorized: only managers and admins can transfer cycle count ownership")
	}

	targetStoreID := manager.StoreId
	if manager.Role == models.RoleAdmin {
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

func (s *CycleCountService) SearchCycleCounts(ctx context.Context, email string, criteria models.CycleCountSearchCriteria) ([]models.CycleCountSummary, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	targetStoreID := employee.StoreId
	if employee.Role == models.RoleAdmin {
		if criteria.StoreId != nil && *criteria.StoreId > 0 {
			targetStoreID = *criteria.StoreId
		} else {
			targetStoreID = 0
		}
	}

	return s.cycleCountRepo.SearchCycleCounts(ctx, targetStoreID, criteria)
}

func (s *CycleCountService) GetSchedule(ctx context.Context, email string, fromStr, toStr string, storeIDOverride ...*int) ([]models.CycleCountScheduleEntry, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	targetStoreID := employee.StoreId
	if employee.Role == models.RoleAdmin {
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

func (s *CycleCountService) CreateScheduleEntry(ctx context.Context, email string, req models.CreateScheduleRequest) (*models.CycleCountScheduleEntry, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	if employee.Role != models.RoleManager && employee.Role != models.RoleAdmin {
		return nil, errors.New("unauthorized: only managers and admins can schedule cycle counts")
	}

	scheduledDate, err := time.Parse("2006-01-02", req.ScheduledDate)
	if err != nil {
		return nil, fmt.Errorf("invalid date format, expected YYYY-MM-DD: %w", err)
	}

	targetStoreID := employee.StoreId
	if req.StoreId != nil && *req.StoreId > 0 && employee.Role == models.RoleAdmin {
		targetStoreID = *req.StoreId
	}

	return s.cycleCountRepo.CreateScheduleEntry(ctx, targetStoreID, req.CategoryId, scheduledDate, employee.EmployeeId)
}
