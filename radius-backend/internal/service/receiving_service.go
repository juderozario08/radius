// radius-backend/internal/service/receiving_service.go
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

func (s *ReceivingService) getEmployeeAndStoreID(ctx context.Context, email string) (*models.Employee, *int, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, nil, err
	}
	if employee == nil {
		return nil, nil, errors.New("employee not found")
	}

	// Admins see all stores (storeID = nil)
	if employee.Role == "ADMIN" {
		return employee, nil, nil
	}
	return employee, &employee.StoreId, nil
}

func (s *ReceivingService) GetPurchaseOrders(ctx context.Context, email string) ([]models.PurchaseOrderSummary, error) {
	_, storeID, err := s.getEmployeeAndStoreID(ctx, email)
	if err != nil {
		return nil, err
	}
	return s.receivingRepo.GetPurchaseOrders(ctx, storeID)
}

func (s *ReceivingService) GetPurchaseOrderDetail(ctx context.Context, email string, poID int) (*models.PurchaseOrderDetailResponse, error) {
	_, _, err := s.getEmployeeAndStoreID(ctx, email)
	if err != nil {
		return nil, err
	}
	detail, err := s.receivingRepo.GetPurchaseOrderDetail(ctx, poID)
	if err != nil {
		return nil, err
	}
	if detail == nil {
		return nil, errors.New("purchase order not found")
	}
	return detail, nil
}

func (s *ReceivingService) CheckProductInPO(ctx context.Context, email string, poID int, barcode string) (*models.CheckProductInPOResponse, error) {
	_, _, err := s.getEmployeeAndStoreID(ctx, email)
	if err != nil {
		return nil, err
	}

	item, err := s.receivingRepo.CheckProductInPO(ctx, poID, barcode)
	if err != nil {
		return nil, err
	}

	if item == nil {
		return &models.CheckProductInPOResponse{Found: false, Item: nil}, nil
	}
	return &models.CheckProductInPOResponse{Found: true, Item: item}, nil
}

func (s *ReceivingService) ReceivePO(ctx context.Context, email string, req models.ReceivePORequest) error {
	employee, _, err := s.getEmployeeAndStoreID(ctx, email)
	if err != nil {
		return err
	}

	// Get PO detail to find the store_id
	detail, err := s.receivingRepo.GetPurchaseOrderDetail(ctx, req.PoId)
	if err != nil {
		return err
	}
	if detail == nil {
		return errors.New("purchase order not found")
	}

	// Non-admins can only receive for their own store
	if employee.Role != "ADMIN" && detail.StoreId != employee.StoreId {
		return errors.New("cannot receive for a different store")
	}

	return s.receivingRepo.ReceivePOItems(ctx, detail.StoreId, req.PoId, req.Items)
}

func (s *ReceivingService) ReceiveLPR(ctx context.Context, email string, req models.ReceiveLPRRequest) error {
	employee, _, err := s.getEmployeeAndStoreID(ctx, email)
	if err != nil {
		return err
	}

	detail, err := s.receivingRepo.GetPurchaseOrderDetail(ctx, req.PoId)
	if err != nil {
		return err
	}
	if detail == nil {
		return errors.New("purchase order not found")
	}

	if employee.Role != "ADMIN" && detail.StoreId != employee.StoreId {
		return errors.New("cannot receive for a different store")
	}

	return s.receivingRepo.ReceiveLPR(ctx, detail.StoreId, req.PoId, req.LprBarcode, employee.EmployeeId)
}

func (s *ReceivingService) GetStockTransfers(ctx context.Context, email string) ([]models.StockTransferSummary, error) {
	_, storeID, err := s.getEmployeeAndStoreID(ctx, email)
	if err != nil {
		return nil, err
	}
	return s.receivingRepo.GetStockTransfers(ctx, storeID)
}

func (s *ReceivingService) GetStockTransferDetail(ctx context.Context, email string, transferID int) (*models.StockTransferDetailResponse, error) {
	_, _, err := s.getEmployeeAndStoreID(ctx, email)
	if err != nil {
		return nil, err
	}
	detail, err := s.receivingRepo.GetStockTransferDetail(ctx, transferID)
	if err != nil {
		return nil, err
	}
	if detail == nil {
		return nil, errors.New("transfer not found")
	}
	return detail, nil
}

func (s *ReceivingService) CheckProductInTransfer(ctx context.Context, email string, transferID int, barcode string) (*models.CheckProductInTransferResponse, error) {
	_, _, err := s.getEmployeeAndStoreID(ctx, email)
	if err != nil {
		return nil, err
	}

	item, err := s.receivingRepo.CheckProductInTransfer(ctx, transferID, barcode)
	if err != nil {
		return nil, err
	}

	if item == nil {
		return &models.CheckProductInTransferResponse{Found: false, Item: nil}, nil
	}
	return &models.CheckProductInTransferResponse{Found: true, Item: item}, nil
}

func (s *ReceivingService) ReceiveTransfer(ctx context.Context, email string, req models.ReceiveTransferRequest) error {
	employee, _, err := s.getEmployeeAndStoreID(ctx, email)
	if err != nil {
		return err
	}

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

	// Get the to_store_id from the transfer
	var toStoreID int
	// We need to look up the actual to_store_id from the transfers table
	// Since the detail doesn't directly expose it, use the employee's store
	toStoreID = employee.StoreId

	return s.receivingRepo.ReceiveTransferItems(ctx, toStoreID, req.TransferId, req.Items)
}

func (s *ReceivingService) QuickReceiveTransfer(ctx context.Context, email string, req models.QuickReceiveTransferRequest) error {
	employee, _, err := s.getEmployeeAndStoreID(ctx, email)
	if err != nil {
		return err
	}

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

	return s.receivingRepo.QuickReceiveTransfer(ctx, employee.StoreId, req.TransferId)
}
