package service

import (
	"context"
	"errors"
	"radius/internal/models"
)

type ReceivingService struct {
	receivingRepo ReceivingRepository
	employeeRepo  EmployeeRepository
}

func NewReceivingService(receivingRepo ReceivingRepository, employeeRepo EmployeeRepository) *ReceivingService {
	return &ReceivingService{
		receivingRepo: receivingRepo,
		employeeRepo:  employeeRepo,
	}
}

func (s *ReceivingService) GetPurchaseOrders(ctx context.Context, storeId int, role string, storeIDOverride *int) ([]models.PurchaseOrderSummary, error) {
	if role == string(models.RoleAdmin) && storeIDOverride != nil {
		return s.receivingRepo.GetPurchaseOrders(ctx, storeIDOverride)
	}
	var targetStore *int
	if role != string(models.RoleAdmin) {
		targetStore = &storeId
	}
	return s.receivingRepo.GetPurchaseOrders(ctx, targetStore)
}

func (s *ReceivingService) GetPurchaseOrderDetail(ctx context.Context, poID int) (*models.PurchaseOrderDetailResponse, error) {
	detail, err := s.receivingRepo.GetPurchaseOrderDetail(ctx, poID)
	if err != nil {
		return nil, err
	}
	if detail == nil {
		return nil, errors.New("purchase order not found")
	}
	return detail, nil
}

func (s *ReceivingService) CheckProductInPO(ctx context.Context, poID int, barcode string) (*models.CheckProductInPOResponse, error) {
	item, err := s.receivingRepo.CheckProductInPO(ctx, poID, barcode)
	if err != nil {
		return nil, err
	}

	if item == nil {
		return &models.CheckProductInPOResponse{Found: false, Item: nil}, nil
	}
	return &models.CheckProductInPOResponse{Found: true, Item: item}, nil
}

func (s *ReceivingService) ReceivePO(ctx context.Context, storeId int, employeeId int, role string, req models.ReceivePORequest) error {
	detail, err := s.receivingRepo.GetPurchaseOrderDetail(ctx, req.PoId)
	if err != nil {
		return err
	}
	if detail == nil {
		return errors.New("purchase order not found")
	}

	if role != "ADMIN" && detail.StoreId != storeId {
		return errors.New("cannot receive for a different store")
	}

	return s.receivingRepo.ReceivePOItems(ctx, detail.StoreId, req.PoId, employeeId, req.Items)
}

func (s *ReceivingService) ReceiveLPR(ctx context.Context, storeId int, employeeId int, role string, req models.ReceiveLPRRequest) error {
	detail, err := s.receivingRepo.GetPurchaseOrderDetail(ctx, req.PoId)
	if err != nil {
		return err
	}
	if detail == nil {
		return errors.New("purchase order not found")
	}

	if role != "ADMIN" && detail.StoreId != storeId {
		return errors.New("cannot receive for a different store")
	}

	return s.receivingRepo.ReceiveLPR(ctx, detail.StoreId, req.PoId, req.LprBarcode, employeeId)
}

func (s *ReceivingService) GetStockTransfers(ctx context.Context, storeId int, role string) ([]models.StockTransferSummary, error) {
	var targetStore *int
	if role != "ADMIN" {
		targetStore = &storeId
	}
	return s.receivingRepo.GetStockTransfers(ctx, targetStore)
}

func (s *ReceivingService) GetStockTransferDetail(ctx context.Context, transferID int) (*models.StockTransferDetailResponse, error) {
	detail, err := s.receivingRepo.GetStockTransferDetail(ctx, transferID)
	if err != nil {
		return nil, err
	}
	if detail == nil {
		return nil, errors.New("transfer not found")
	}
	return detail, nil
}

func (s *ReceivingService) CheckProductInTransfer(ctx context.Context, transferID int, barcode string) (*models.CheckProductInTransferResponse, error) {
	item, err := s.receivingRepo.CheckProductInTransfer(ctx, transferID, barcode)
	if err != nil {
		return nil, err
	}

	if item == nil {
		return &models.CheckProductInTransferResponse{Found: false, Item: nil}, nil
	}
	return &models.CheckProductInTransferResponse{Found: true, Item: item}, nil
}

func (s *ReceivingService) ReceiveTransfer(ctx context.Context, storeId int, employeeId int, req models.ReceiveTransferRequest) error {
	detail, err := s.receivingRepo.GetStockTransferDetail(ctx, req.TransferId)
	if err != nil {
		return err
	}
	if detail == nil {
		return errors.New("transfer not found")
	}
	if detail.Status != "IN_TRANSIT" {
		return errors.New("transfer is not in transit")
	}

	return s.receivingRepo.ReceiveTransferItems(ctx, storeId, req.TransferId, employeeId, req.Items)
}

func (s *ReceivingService) QuickReceiveTransfer(ctx context.Context, storeId int, employeeId int, req models.QuickReceiveTransferRequest) error {
	detail, err := s.receivingRepo.GetStockTransferDetail(ctx, req.TransferId)
	if err != nil {
		return err
	}
	if detail == nil {
		return errors.New("transfer not found")
	}
	if detail.Status != "IN_TRANSIT" {
		return errors.New("transfer is not in transit")
	}
	if detail.ManualCheckRequired {
		return errors.New("this transfer requires manual check — cannot quick receive")
	}

	return s.receivingRepo.QuickReceiveTransfer(ctx, storeId, req.TransferId, employeeId)
}
