package service

import (
	"context"
	"errors"
	"fmt"
	"radius/internal/models"
	"time"
)

type ReturnsService struct {
	returnsRepo  ReturnsRepository
	employeeRepo EmployeeRepository
	productRepo  ProductRepository
	salesRepo    SalesRepository
	broadcaster  EventBroadcaster
}

func NewReturnsService(
	returnsRepo ReturnsRepository,
	employeeRepo EmployeeRepository,
	productRepo ProductRepository,
	salesRepo SalesRepository,
	broadcaster ...EventBroadcaster,
) *ReturnsService {
	svc := &ReturnsService{
		returnsRepo:  returnsRepo,
		employeeRepo: employeeRepo,
		productRepo:  productRepo,
		salesRepo:    salesRepo,
	}
	if len(broadcaster) > 0 && broadcaster[0] != nil {
		svc.broadcaster = broadcaster[0]
	}
	return svc
}

func (s *ReturnsService) SetBroadcaster(broadcaster EventBroadcaster) {
	s.broadcaster = broadcaster
}

func (s *ReturnsService) CreateReturn(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, req models.CreateReturnRequest) (*models.CustomerReturn, error) {
	storeID := storeId
	if role == models.RoleAdmin && req.StoreId != nil && *req.StoreId > 0 {
		storeID = *req.StoreId
	}

	if len(req.Items) == 0 {
		return nil, errors.New("return must contain at least one item")
	}

	var lookupTx *models.LookupTransactionResponse
	var err error
	if req.OriginalTransactionId != nil && *req.OriginalTransactionId > 0 {
		lookupTx, err = s.returnsRepo.LookupTransaction(ctx, *req.OriginalTransactionId, &storeID)
		if err != nil {
			return nil, fmt.Errorf("failed to lookup original transaction: %w", err)
		}
		if lookupTx == nil && role == models.RoleAdmin {
			lookupTx, err = s.returnsRepo.LookupTransaction(ctx, *req.OriginalTransactionId, nil)
			if err != nil {
				return nil, fmt.Errorf("failed to lookup original transaction: %w", err)
			}
		}
		if lookupTx == nil {
			return nil, errors.New("original transaction not found")
		}
	}

	var subtotal float64
	for _, item := range req.Items {
		if item.Quantity <= 0 {
			return nil, errors.New("quantity must be greater than zero")
		}
		if item.UnitPrice < 0 {
			return nil, errors.New("unit price cannot be negative")
		}

		product, err := s.productRepo.GetProductByID(ctx, item.ProductId)
		if err != nil {
			return nil, fmt.Errorf("product %d not found", item.ProductId)
		}
		if !product.IsReturnable {
			return nil, fmt.Errorf("product '%s' is marked as non-returnable", product.Name)
		}

		if lookupTx != nil && item.OriginalTransactionItemId != nil {
			var matchedItem *models.OriginalTransactionItemForReturn
			for i := range lookupTx.Items {
				if lookupTx.Items[i].TransactionItemId == *item.OriginalTransactionItemId {
					matchedItem = &lookupTx.Items[i]
					break
				}
			}

			if matchedItem != nil {
				if item.Quantity > matchedItem.ReturnableQty {
					return nil, fmt.Errorf("requested return qty (%d) exceeds returnable qty (%d) for '%s'", item.Quantity, matchedItem.ReturnableQty, matchedItem.ProductName)
				}
				if matchedItem.IsOutsidePolicyWindow && req.RefundMethod != models.RefundMethodStoreCredit {
					return nil, fmt.Errorf("item '%s' is outside return policy window (%d days) and must be refunded via STORE_CREDIT", matchedItem.ProductName, matchedItem.ReturnWindowDays)
				}
			}
		}

		subtotal += item.UnitPrice * float64(item.Quantity)
	}

	totalRefund := subtotal * 1.05

	status := models.ReturnStatusCompleted
	if totalRefund > 50.0 && role != models.RoleManager && role != models.RoleAdmin {
		status = models.ReturnStatusPendingApproval
	}

	createdReturn, items, err := s.returnsRepo.CreateReturn(ctx, storeID, employeeId, status, req)
	if err != nil {
		return nil, err
	}

	if s.broadcaster != nil && createdReturn != nil {
		now := time.Now().UTC()
		activityType := "CUSTOMER_RETURN_COMPLETED"
		title := fmt.Sprintf("Return #%d Processed", createdReturn.ReturnId)
		desc := fmt.Sprintf("Processed refund of $%.2f (%s) for %d item(s)", createdReturn.TotalRefund, createdReturn.RefundMethod, len(items))

		if status == models.ReturnStatusPendingApproval {
			activityType = "CUSTOMER_RETURN_PENDING_APPROVAL"
			title = fmt.Sprintf("Return #%d Pending Approval", createdReturn.ReturnId)
			desc = fmt.Sprintf("Return #%d of $%.2f exceeds $50.00 and requires manager approval", createdReturn.ReturnId, createdReturn.TotalRefund)
		}

		payload := models.StoreActivityPayload{
			ActivityId:   fmt.Sprintf("ret-%d-%d", createdReturn.ReturnId, now.UnixMilli()),
			StoreId:      storeID,
			ActivityType: activityType,
			Title:        title,
			Description:  desc,
			Timestamp:    now,
			Metadata: map[string]any{
				"return_id":     createdReturn.ReturnId,
				"total_refund":  createdReturn.TotalRefund,
				"refund_method": createdReturn.RefundMethod,
				"status":        string(status),
				"items_count":   len(items),
			},
		}

		s.broadcaster.BroadcastToStore(storeID, models.WebSocketEvent{
			Type:      models.EventStoreActivity,
			StoreId:   storeID,
			Timestamp: now,
			Payload:   payload,
		})
	}

	return createdReturn, nil
}

func (s *ReturnsService) ApproveReturn(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, returnID int) error {
	if role != models.RoleAdmin && role != models.RoleManager {
		return errors.New("insufficient permissions to approve customer returns")
	}

	retSummary, _, err := s.returnsRepo.GetReturnDetail(ctx, returnID)
	if err != nil {
		return err
	}
	if retSummary == nil {
		return errors.New("return not found")
	}

	if role != models.RoleAdmin && retSummary.StoreId != storeId {
		return errors.New("unauthorized to approve return for another store")
	}

	if err := s.returnsRepo.ApproveReturn(ctx, returnID, employeeId); err != nil {
		return err
	}

	if s.broadcaster != nil {
		now := time.Now().UTC()
		s.broadcaster.BroadcastToStore(retSummary.StoreId, models.WebSocketEvent{
			Type:      models.EventStoreActivity,
			StoreId:   retSummary.StoreId,
			Timestamp: now,
			Payload: models.StoreActivityPayload{
				ActivityId:   fmt.Sprintf("ret-approved-%d-%d", returnID, now.UnixMilli()),
				StoreId:      retSummary.StoreId,
				ActivityType: "CUSTOMER_RETURN_APPROVED",
				Title:        fmt.Sprintf("Return #%d Approved", returnID),
				Description:  fmt.Sprintf("Manager approved return #%d for $%.2f", returnID, retSummary.TotalRefund),
				Timestamp:    now,
				Metadata: map[string]any{
					"return_id":    returnID,
					"approved_by":  employeeId,
					"total_refund": retSummary.TotalRefund,
				},
			},
		})
	}

	return nil
}

func (s *ReturnsService) RejectReturn(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, returnID int, reason string) error {
	if role != models.RoleAdmin && role != models.RoleManager {
		return errors.New("insufficient permissions to reject customer returns")
	}

	retSummary, _, err := s.returnsRepo.GetReturnDetail(ctx, returnID)
	if err != nil {
		return err
	}
	if retSummary == nil {
		return errors.New("return not found")
	}

	if role != models.RoleAdmin && retSummary.StoreId != storeId {
		return errors.New("unauthorized to reject return for another store")
	}

	return s.returnsRepo.RejectReturn(ctx, returnID, employeeId, reason)
}

func (s *ReturnsService) GetReturns(ctx context.Context, storeId int, role models.EmployeeRole, criteria models.ReturnSearchCriteria, page, limit int) ([]models.CustomerReturnSummary, int, error) {
	var storeID *int
	if role == models.RoleAdmin {
		if criteria.StoreId != nil && *criteria.StoreId > 0 {
			storeID = criteria.StoreId
		}
	} else {
		storeID = &storeId
	}

	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 15
	}
	offset := (page - 1) * limit

	return s.returnsRepo.GetReturns(ctx, storeID, criteria, limit, offset)
}

func (s *ReturnsService) GetReturnDetail(ctx context.Context, storeId int, role models.EmployeeRole, returnID int) (*models.CustomerReturnDetailResponse, error) {
	summary, items, err := s.returnsRepo.GetReturnDetail(ctx, returnID)
	if err != nil {
		return nil, err
	}
	if summary == nil {
		return nil, errors.New("return not found")
	}

	if role != models.RoleAdmin && summary.StoreId != storeId {
		return nil, errors.New("unauthorized to view return for another store")
	}

	return &models.CustomerReturnDetailResponse{
		Return: *summary,
		Items:  items,
	}, nil
}

func (s *ReturnsService) LookupTransaction(ctx context.Context, storeId int, role models.EmployeeRole, transactionID int64) (*models.LookupTransactionResponse, error) {
	var storeID *int
	if role != models.RoleAdmin {
		storeID = &storeId
	}

	resp, err := s.returnsRepo.LookupTransaction(ctx, transactionID, storeID)
	if err != nil {
		return nil, err
	}
	if resp == nil {
		return nil, errors.New("transaction not found")
	}

	return resp, nil
}

func (s *ReturnsService) LookupTransactionsByProduct(ctx context.Context, storeId int, barcodeOrUpc string) ([]models.RecentTransactionSummary, error) {
	return s.returnsRepo.LookupTransactionsByProduct(ctx, barcodeOrUpc, storeId)
}

func (s *ReturnsService) GetRtvQueue(ctx context.Context, storeId int, role models.EmployeeRole, status *models.RtvStatus, page, limit int) ([]models.RtvQueueItem, int, error) {
	var storeID *int
	if role != models.RoleAdmin {
		storeID = &storeId
	}

	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	offset := (page - 1) * limit

	return s.returnsRepo.GetRtvQueue(ctx, storeID, status, limit, offset)
}
