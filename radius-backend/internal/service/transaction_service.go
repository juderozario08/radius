// radius-backend/internal/service/transaction_service.go
package service

import (
	"context"
	"fmt"
	"radius/internal/models"
	"time"
)

type TransactionService struct {
	salesRepo      SalesRepository
	employeeRepo   EmployeeRepository
	sessionRepo    SessionRepository
	fillReportRepo FillReportRepository
	broadcaster    EventBroadcaster
}

func NewTransactionService(
	salesRepo SalesRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
	fillReportRepo FillReportRepository,
	broadcaster ...EventBroadcaster,
) *TransactionService {
	svc := &TransactionService{
		salesRepo:      salesRepo,
		employeeRepo:   employeeRepo,
		sessionRepo:    sessionRepo,
		fillReportRepo: fillReportRepo,
	}
	if len(broadcaster) > 0 && broadcaster[0] != nil {
		svc.broadcaster = broadcaster[0]
	}
	return svc
}

// SetBroadcaster allows setting or replacing the real-time event broadcaster.
func (s *TransactionService) SetBroadcaster(broadcaster EventBroadcaster) {
	s.broadcaster = broadcaster
}

func (s *TransactionService) CreateTransaction(ctx context.Context, email string, role models.EmployeeRole, req models.CreateTransactionRequest) (*models.Transaction, error) {
	var storeID int
	var employeeID *int

	if email != "" {
		emp, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
		if err == nil && emp != nil {
			storeID = emp.StoreId
			employeeID = &emp.EmployeeId
		}
	}

	if storeID == 0 && req.StoreId != nil && *req.StoreId > 0 {
		storeID = *req.StoreId
	}

	if storeID == 0 {
		return nil, fmt.Errorf("store ID is required to create a transaction")
	}

	// 1. Create transaction header, items, update on_hand inventory, and audit trail
	tx, items, err := s.salesRepo.CreateTransaction(ctx, storeID, employeeID, req)
	if err != nil {
		return nil, err
	}

	// 2. Automatically report sold items to the store's active Fill Report
	if s.fillReportRepo != nil && len(items) > 0 {
		_ = s.fillReportRepo.AddSoldItems(ctx, storeID, items)
	}

	// 3. Broadcast real-time store activity event
	if s.broadcaster != nil && tx != nil {
		now := time.Now().UTC()
		metadata := map[string]any{
			"transaction_id": tx.TransactionId,
			"register_id":    tx.RegisterId,
			"total_amount":   float64(tx.TotalAmount),
			"items_count":    len(items),
		}
		if employeeID != nil {
			metadata["employee_id"] = *employeeID
		}

		payload := models.StoreActivityPayload{
			ActivityId:   fmt.Sprintf("tx-%d", tx.TransactionId),
			StoreId:      storeID,
			ActivityType: "TRANSACTION_COMPLETED",
			Title:        fmt.Sprintf("POS Sale #%d", tx.TransactionId),
			Description:  fmt.Sprintf("Completed sale of %d item(s) for $%.2f at register %s", len(items), tx.TotalAmount, tx.RegisterId),
			Timestamp:    now,
			Metadata:     metadata,
		}

		s.broadcaster.BroadcastToStore(storeID, models.WebSocketEvent{
			Type:      models.EventStoreActivity,
			StoreId:   storeID,
			Timestamp: now,
			Payload:   payload,
		})
	}

	return tx, nil
}

func (s *TransactionService) GetAllTransactions(ctx context.Context, email string, role models.EmployeeRole, page, limit int) ([]models.Transaction, int, error) {
	var storeID *int
	if role != models.RoleAdmin {
		emp, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
		if err != nil {
			return nil, 0, err
		}
		storeID = &emp.StoreId
	}

	offset := (page - 1) * limit
	return s.salesRepo.GetAllTransactions(ctx, limit, offset, storeID)
}

func (s *TransactionService) GetTransactionByID(ctx context.Context, email string, role models.EmployeeRole, id int) (*models.Transaction, []models.TransactionItem, error) {
	var storeID *int
	if role != models.RoleAdmin {
		emp, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
		if err != nil {
			return nil, nil, err
		}
		storeID = &emp.StoreId
	}

	return s.salesRepo.GetTransactionByID(ctx, id, storeID)
}
