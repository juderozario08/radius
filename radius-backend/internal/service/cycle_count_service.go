// radius-backend/internal/service/cycle_count_service.go
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
}

func NewCycleCountService(
	cycleCountRepo CycleCountRepository,
	employeeRepo EmployeeRepository,
	storeRepo StoreRepository,
	productsRepo ProductRepository,
	inventoryRepo InventoryRepository,
	sessionRepo SessionRepository,
) *CycleCountService {
	return &CycleCountService{
		cycleCountRepo: cycleCountRepo,
		employeeRepo:   employeeRepo,
		storeRepo:      storeRepo,
		productsRepo:   productsRepo,
		inventoryRepo:  inventoryRepo,
		sessionRepo:    sessionRepo,
	}
}

// GetWeeklyCycleCounts retrieves all cycle counts for current week for the employee's store
func (s *CycleCountService) GetWeeklyCycleCounts(ctx context.Context, email string) ([]models.CycleCountSummary, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	return s.cycleCountRepo.GetWeeklyCycleCounts(ctx, employee.StoreId)
}

// GetCycleCountDetail retrieves full count details and items with auto-assignment and locking
func (s *CycleCountService) GetCycleCountDetail(ctx context.Context, email string, countID int) (*models.CycleCountDetailResponse, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, countID, employee.StoreId)
	if err != nil {
		return nil, err
	}
	if count == nil {
		return nil, fmt.Errorf("cycle count %d not found", countID)
	}

	// 1. Auto-assign unassigned count to the current employee
	if count.CountedBy == nil {
		updatedCount, err := s.cycleCountRepo.AutoAssignCycleCount(ctx, countID, employee.StoreId, employee.EmployeeId)
		if err != nil {
			return nil, err
		}
		if updatedCount != nil {
			count = updatedCount
		}
	} else if *count.CountedBy != employee.EmployeeId {
		// 2. Concurrency lock check: non-manager cannot access someone else's active count
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

// GetCycleCountItems retrieves items for a count
func (s *CycleCountService) GetCycleCountItems(ctx context.Context, email string, countID int) ([]models.CycleCountItemDetail, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	// Verify store ownership and access lock
	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, countID, employee.StoreId)
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

// StartCount initializes a count for a category snapshotting on-hand inventory
func (s *CycleCountService) StartCount(ctx context.Context, email string, categoryID int) (*models.CycleCount, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	return s.cycleCountRepo.StartCycleCount(ctx, employee.StoreId, categoryID, employee.EmployeeId)
}

// RecordScan updates a product's counted quantity
func (s *CycleCountService) RecordScan(ctx context.Context, email string, req models.RecordScanRequest) (*models.CycleCountItemDetail, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, req.CountId, employee.StoreId)
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

	return s.cycleCountRepo.RecordScan(ctx, employee.StoreId, req, employee.EmployeeId)
}

// SubmitForApproval submits the completed count for manager review
func (s *CycleCountService) SubmitForApproval(ctx context.Context, email string, req models.SubmitCycleCountRequest) error {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return err
	}
	if employee == nil {
		return errors.New("employee not found")
	}

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, req.CountId, employee.StoreId)
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

	return s.cycleCountRepo.SubmitForApproval(ctx, employee.StoreId, req.CountId, req.Notes)
}

// ApproveCount allows a store manager or admin to approve the count, updating inventory & audit trail
func (s *CycleCountService) ApproveCount(ctx context.Context, email string, req models.ApproveCycleCountRequest) error {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return err
	}
	if employee == nil {
		return errors.New("employee not found")
	}

	// Only managers and admins can approve cycle counts (managers can approve their own or employee counts)
	if employee.Role != models.RoleManager && employee.Role != models.RoleAdmin {
		return errors.New("unauthorized: only managers and admins can approve cycle counts")
	}

	return s.cycleCountRepo.ApproveCycleCount(ctx, employee.StoreId, req.CountId, employee.EmployeeId)
}

// TransferOwnership allows a store manager or admin to reassign a count to another employee
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

	count, err := s.cycleCountRepo.GetCycleCountByID(ctx, req.CountId, manager.StoreId)
	if err != nil {
		return err
	}
	if count == nil {
		return fmt.Errorf("cycle count %d not found", req.CountId)
	}

	// Validate target employee
	targetEmployee, err := s.employeeRepo.GetEmployeeById(ctx, req.EmployeeId)
	if err != nil {
		return err
	}
	if targetEmployee == nil || targetEmployee.StoreId != manager.StoreId || (targetEmployee.IsTerminated != nil && *targetEmployee.IsTerminated) || (targetEmployee.IsActive != nil && !*targetEmployee.IsActive) {
		return errors.New("target employee not found or not active in this store")
	}

	return s.cycleCountRepo.TransferOwnership(ctx, manager.StoreId, req.CountId, req.EmployeeId)
}

// SearchCycleCounts searches cycle counts with query / filters
func (s *CycleCountService) SearchCycleCounts(ctx context.Context, email string, criteria models.CycleCountSearchCriteria) ([]models.CycleCountSummary, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	return s.cycleCountRepo.SearchCycleCounts(ctx, employee.StoreId, criteria)
}

// GetSchedule returns scheduled cycle counts for calendar view
func (s *CycleCountService) GetSchedule(ctx context.Context, email string, fromStr, toStr string) ([]models.CycleCountScheduleEntry, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	var fromDate, toDate time.Time
	if fromStr != "" {
		parsedFrom, err := time.Parse("2006-01-02", fromStr)
		if err == nil {
			fromDate = parsedFrom
		}
	}
	if fromDate.IsZero() {
		// Default from date: start of current month
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
		// Default to date: 60 days in the future
		toDate = fromDate.AddDate(0, 2, 0)
	}

	return s.cycleCountRepo.GetSchedule(ctx, employee.StoreId, fromDate, toDate)
}

// CreateScheduleEntry schedules a count for a category on a given date
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

	return s.cycleCountRepo.CreateScheduleEntry(ctx, employee.StoreId, req.CategoryId, scheduledDate, employee.EmployeeId)
}
