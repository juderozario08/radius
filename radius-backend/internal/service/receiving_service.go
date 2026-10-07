package service

import (
	"context"
	"fmt"
	"radius/internal/cache"
	"radius/internal/models"

	"github.com/redis/go-redis/v9"
)

type ReceivingService struct {
	receivingRepo ReceivingRepository
	employeeRepo  EmployeeRepository
	redisClient   *redis.Client
}

func NewReceivingService(receivingRepo ReceivingRepository, employeeRepo EmployeeRepository, redisClient ...*redis.Client) *ReceivingService {
	svc := &ReceivingService{
		receivingRepo: receivingRepo,
		employeeRepo:  employeeRepo,
	}
	if len(redisClient) > 0 && redisClient[0] != nil {
		svc.redisClient = redisClient[0]
	}
	return svc
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
		return nil, fmt.Errorf("%w: purchase order not found", ErrNotFound)
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
		return fmt.Errorf("%w: purchase order not found", ErrNotFound)
	}

	if role != "ADMIN" && detail.StoreId != storeId {
		return fmt.Errorf("%w: cannot receive for a different store", ErrValidation)
	}

	err = s.receivingRepo.ReceivePOItems(ctx, detail.StoreId, req.PoId, employeeId, req.Items)
	if err != nil {
		return err
	}

	cache.InvalidateStoreOperations(ctx, s.redisClient, detail.StoreId)

	if s.redisClient != nil {
		for _, itm := range detail.Items {
			tier2Key := cache.InventoryProductKey(detail.StoreId, itm.ProductId)
			_ = s.redisClient.Del(ctx, tier2Key).Err()
			if itm.Upc != "" {
				_ = s.redisClient.Del(ctx, cache.LegacyInventoryBarcodeKey(detail.StoreId, itm.Upc)).Err()
			}
			if itm.Sku != "" {
				_ = s.redisClient.Del(ctx, cache.LegacyInventoryBarcodeKey(detail.StoreId, itm.Sku)).Err()
			}
		}
	}
	return nil
}

func (s *ReceivingService) ReceiveLPR(ctx context.Context, storeId int, employeeId int, role string, req models.ReceiveLPRRequest) error {
	detail, err := s.receivingRepo.GetPurchaseOrderDetail(ctx, req.PoId)
	if err != nil {
		return err
	}
	if detail == nil {
		return fmt.Errorf("%w: purchase order not found", ErrNotFound)
	}

	if role != "ADMIN" && detail.StoreId != storeId {
		return fmt.Errorf("%w: cannot receive for a different store", ErrValidation)
	}

	err = s.receivingRepo.ReceiveLPR(ctx, detail.StoreId, req.PoId, req.LprBarcode, employeeId)
	if err != nil {
		return err
	}

	cache.InvalidateStoreOperations(ctx, s.redisClient, detail.StoreId)

	if s.redisClient != nil {
		patterns := []string{
			cache.InventoryStorePattern(detail.StoreId),
			cache.LegacyInventoryStorePattern(detail.StoreId),
		}
		for _, pat := range patterns {
			iter := s.redisClient.Scan(ctx, 0, pat, 100).Iterator()
			for iter.Next(ctx) {
				_ = s.redisClient.Del(ctx, iter.Val()).Err()
			}
		}
	}
	return nil
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
		return nil, fmt.Errorf("%w: transfer not found", ErrNotFound)
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
		return fmt.Errorf("%w: transfer not found", ErrNotFound)
	}
	if detail.Status != "IN_TRANSIT" {
		return fmt.Errorf("%w: transfer is not in transit", ErrValidation)
	}

	err = s.receivingRepo.ReceiveTransferItems(ctx, storeId, req.TransferId, employeeId, req.Items)
	if err != nil {
		return err
	}
	cache.InvalidateStoreOperations(ctx, s.redisClient, storeId)
	if s.redisClient != nil {
		for _, itm := range detail.Items {
			_ = s.redisClient.Del(ctx, cache.InventoryProductKey(storeId, itm.ProductId)).Err()
			if itm.Upc != "" {
				_ = s.redisClient.Del(ctx, cache.LegacyInventoryBarcodeKey(storeId, itm.Upc)).Err()
			}
			if itm.Sku != "" {
				_ = s.redisClient.Del(ctx, cache.LegacyInventoryBarcodeKey(storeId, itm.Sku)).Err()
			}
		}
	}
	return nil
}

func (s *ReceivingService) QuickReceiveTransfer(ctx context.Context, storeId int, employeeId int, req models.QuickReceiveTransferRequest) error {
	detail, err := s.receivingRepo.GetStockTransferDetail(ctx, req.TransferId)
	if err != nil {
		return err
	}
	if detail == nil {
		return fmt.Errorf("%w: transfer not found", ErrNotFound)
	}
	if detail.Status != "IN_TRANSIT" {
		return fmt.Errorf("%w: transfer is not in transit", ErrValidation)
	}
	if detail.ManualCheckRequired {
		return fmt.Errorf("%w: this transfer requires manual check", ErrValidation)
	}

	err = s.receivingRepo.QuickReceiveTransfer(ctx, storeId, req.TransferId, employeeId)
	if err != nil {
		return err
	}
	cache.InvalidateStoreOperations(ctx, s.redisClient, storeId)
	if s.redisClient != nil {
		for _, itm := range detail.Items {
			_ = s.redisClient.Del(ctx, cache.InventoryProductKey(storeId, itm.ProductId)).Err()
			if itm.Upc != "" {
				_ = s.redisClient.Del(ctx, cache.LegacyInventoryBarcodeKey(storeId, itm.Upc)).Err()
			}
			if itm.Sku != "" {
				_ = s.redisClient.Del(ctx, cache.LegacyInventoryBarcodeKey(storeId, itm.Sku)).Err()
			}
		}
	}
	return nil
}
