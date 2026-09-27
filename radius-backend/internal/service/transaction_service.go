package service

import (
	"context"
	"fmt"
	"radius/internal/models"
	"time"

	"github.com/redis/go-redis/v9"
)

type TransactionService struct {
	salesRepo      SalesRepository
	employeeRepo   EmployeeRepository
	sessionRepo    SessionRepository
	fillReportRepo FillReportRepository
	broadcaster    EventBroadcaster
	redisClient    *redis.Client
}

func NewTransactionService(
	salesRepo SalesRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
	fillReportRepo FillReportRepository,
	deps ...any,
) *TransactionService {
	svc := &TransactionService{
		salesRepo:      salesRepo,
		employeeRepo:   employeeRepo,
		sessionRepo:    sessionRepo,
		fillReportRepo: fillReportRepo,
	}
	for _, dep := range deps {
		switch v := dep.(type) {
		case EventBroadcaster:
			svc.broadcaster = v
		case *redis.Client:
			svc.redisClient = v
		}
	}
	return svc
}

func (s *TransactionService) SetBroadcaster(broadcaster EventBroadcaster) {
	s.broadcaster = broadcaster
}

func (s *TransactionService) CreateTransaction(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, req models.CreateTransactionRequest) (*models.Transaction, error) {
	targetStoreID := storeId
	if targetStoreID == 0 && req.StoreId != nil && *req.StoreId > 0 {
		targetStoreID = *req.StoreId
	}

	if targetStoreID == 0 {
		return nil, fmt.Errorf("store ID is required to create a transaction")
	}

	var empID *int
	if employeeId > 0 {
		empID = &employeeId
	}

	tx, items, err := s.salesRepo.CreateTransaction(ctx, targetStoreID, empID, req)
	if err != nil {
		return nil, err
	}

	if s.redisClient != nil && len(items) > 0 {
		for _, itm := range items {
			tier2Key := fmt.Sprintf("radius:v1:inventory:store:%d:product:%d", targetStoreID, itm.ProductId)
			_ = s.redisClient.Del(ctx, tier2Key).Err()
			if itm.ScannedBarcode != nil && *itm.ScannedBarcode != "" {
				legacyKey := fmt.Sprintf("inventory:%d:barcode:%s", targetStoreID, *itm.ScannedBarcode)
				_ = s.redisClient.Del(ctx, legacyKey).Err()
			}
		}
	}

	if s.fillReportRepo != nil && len(items) > 0 {
		_ = s.fillReportRepo.AddSoldItems(ctx, targetStoreID, items)
	}

	if s.broadcaster != nil && tx != nil {
		now := time.Now().UTC()
		metadata := map[string]any{
			"transaction_id": tx.TransactionId,
			"register_id":    tx.RegisterId,
			"total_amount":   float64(tx.TotalAmount),
			"items_count":    len(items),
		}
		if empID != nil {
			metadata["employee_id"] = *empID
		}

		payload := models.StoreActivityPayload{
			ActivityId:   fmt.Sprintf("tx-%d", tx.TransactionId),
			StoreId:      targetStoreID,
			ActivityType: "TRANSACTION_COMPLETED",
			Title:        fmt.Sprintf("POS Sale #%d", tx.TransactionId),
			Description:  fmt.Sprintf("Completed sale of %d item(s) for $%.2f at register %s", len(items), tx.TotalAmount, tx.RegisterId),
			Timestamp:    now,
			Metadata:     metadata,
		}

		s.broadcaster.BroadcastToStore(targetStoreID, models.WebSocketEvent{
			Type:      models.EventStoreActivity,
			StoreId:   targetStoreID,
			Timestamp: now,
			Payload:   payload,
		})
	}

	return tx, nil
}

func (s *TransactionService) GetAllTransactions(ctx context.Context, storeId int, role models.EmployeeRole, page, limit int) ([]models.Transaction, int, error) {
	var targetStoreID *int
	if role != models.RoleAdmin {
		targetStoreID = &storeId
	}

	offset := (page - 1) * limit
	return s.salesRepo.GetAllTransactions(ctx, limit, offset, targetStoreID)
}

func (s *TransactionService) GetTransactionByID(ctx context.Context, storeId int, role models.EmployeeRole, id int) (*models.Transaction, []models.TransactionItem, error) {
	var targetStoreID *int
	if role != models.RoleAdmin {
		targetStoreID = &storeId
	}

	return s.salesRepo.GetTransactionByID(ctx, id, targetStoreID)
}
