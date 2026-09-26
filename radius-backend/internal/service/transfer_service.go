package service

import (
	"context"
	"errors"
	"fmt"
	"radius/internal/models"
	"time"
)

type TransferService struct {
	transferRepo TransferRepository
	employeeRepo EmployeeRepository
	broadcaster  EventBroadcaster
}

func NewTransferService(
	transferRepo TransferRepository,
	employeeRepo EmployeeRepository,
	broadcaster ...EventBroadcaster,
) *TransferService {
	svc := &TransferService{
		transferRepo: transferRepo,
		employeeRepo: employeeRepo,
	}
	if len(broadcaster) > 0 && broadcaster[0] != nil {
		svc.broadcaster = broadcaster[0]
	}
	return svc
}

func (s *TransferService) SetBroadcaster(broadcaster EventBroadcaster) {
	s.broadcaster = broadcaster
}

func (s *TransferService) CreateTransfer(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, req models.CreateTransferRequest) (*models.StockTransfer, error) {
	if role != models.RoleAdmin && role != models.RoleManager {
		return nil, errors.New("insufficient permissions to create stock transfers")
	}

	fromStoreID := storeId
	if role == models.RoleAdmin && req.FromStoreId != nil && *req.FromStoreId > 0 {
		fromStoreID = *req.FromStoreId
	}

	toStoreID := req.ToStoreId
	if fromStoreID == toStoreID {
		return nil, errors.New("origin and destination store cannot be the same")
	}

	if toStoreID == 1 {
		return nil, errors.New("head office cannot receive transfers")
	}

	if len(req.Items) == 0 {
		return nil, errors.New("transfer must contain at least one item")
	}

	for _, item := range req.Items {
		if item.QtyRequested <= 0 {
			return nil, errors.New("requested quantity must be greater than zero")
		}
	}

	return s.transferRepo.CreateTransfer(ctx, fromStoreID, toStoreID, employeeId, req.TransferReason, req.ManualCheckRequired, req.Items)
}

func (s *TransferService) GetOutboundTransfers(ctx context.Context, storeId int, role models.EmployeeRole, pageSize, pageNumber int, filterStoreID *int) ([]models.OutboundTransferSummary, int, error) {
	var storeID *int
	if role == models.RoleAdmin {
		if filterStoreID != nil && *filterStoreID > 0 {
			storeID = filterStoreID
		}
	} else {
		storeID = &storeId
	}

	limit := pageSize
	offset := (pageNumber - 1) * pageSize

	return s.transferRepo.GetOutboundTransfers(ctx, storeID, limit, offset)
}

func (s *TransferService) GetOutboundTransferDetail(ctx context.Context, storeId int, role models.EmployeeRole, transferID int) (*models.OutboundTransferDetailResponse, error) {
	detail, err := s.transferRepo.GetOutboundTransferDetail(ctx, transferID)
	if err != nil {
		return nil, err
	}
	if detail == nil {
		return nil, errors.New("transfer not found")
	}

	if role != models.RoleAdmin && detail.FromStoreId != storeId && detail.ToStoreId != storeId {
		return nil, errors.New("unauthorized to view this transfer")
	}

	return detail, nil
}

func (s *TransferService) DispatchTransfer(ctx context.Context, storeId int, role models.EmployeeRole, req models.DispatchTransferRequest) error {
	if role != models.RoleAdmin && role != models.RoleManager {
		return errors.New("insufficient permissions to dispatch stock transfers")
	}

	detail, err := s.transferRepo.GetOutboundTransferDetail(ctx, req.TransferId)
	if err != nil {
		return err
	}
	if detail == nil {
		return errors.New("transfer not found")
	}

	if role != models.RoleAdmin && detail.FromStoreId != storeId {
		return errors.New("only origin store can dispatch this transfer")
	}

	transfer, toStoreID, err := s.transferRepo.DispatchTransfer(ctx, req.TransferId, req.Carrier, req.TrackingNumber)
	if err != nil {
		return err
	}

	if s.broadcaster != nil {
		fromStoreName := detail.FromStoreName
		if fromStoreName == "" {
			fromStoreName = fmt.Sprintf("Store #%d", transfer.FromStoreId)
		}

		s.broadcaster.BroadcastToStore(toStoreID, models.WebSocketEvent{
			Type:      models.EventStoreActivity,
			StoreId:   toStoreID,
			Timestamp: time.Now().UTC(),
			Payload: models.StoreActivityPayload{
				ActivityId:   fmt.Sprintf("act-transfer-%d-%d", req.TransferId, time.Now().UnixMilli()),
				StoreId:      toStoreID,
				ActivityType: "TRANSFER_INCOMING",
				Title:        fmt.Sprintf("Incoming Transfer #%d", req.TransferId),
				Description:  fmt.Sprintf("Transfer #%d from %s is in transit", req.TransferId, fromStoreName),
				Timestamp:    time.Now().UTC(),
				Metadata: map[string]any{
					"transfer_id":   req.TransferId,
					"from_store_id": transfer.FromStoreId,
				},
			},
		})
	}

	return nil
}

func (s *TransferService) CancelTransfer(ctx context.Context, storeId int, employeeId int, role models.EmployeeRole, req models.CancelTransferRequest) error {
	if role != models.RoleAdmin && role != models.RoleManager {
		return errors.New("insufficient permissions to cancel stock transfers")
	}

	detail, err := s.transferRepo.GetOutboundTransferDetail(ctx, req.TransferId)
	if err != nil {
		return err
	}
	if detail == nil {
		return errors.New("transfer not found")
	}

	if role != models.RoleAdmin && detail.FromStoreId != storeId {
		return errors.New("only origin store can cancel this transfer")
	}

	return s.transferRepo.CancelTransfer(ctx, req.TransferId, employeeId)
}

func (s *TransferService) GetDestinationStores(ctx context.Context, storeId int, role models.EmployeeRole, fromStoreIDParam *int) ([]models.TransferDestinationStore, error) {
	fromStoreID := storeId
	if role == models.RoleAdmin && fromStoreIDParam != nil && *fromStoreIDParam > 0 {
		fromStoreID = *fromStoreIDParam
	}

	return s.transferRepo.GetDestinationStores(ctx, fromStoreID)
}
