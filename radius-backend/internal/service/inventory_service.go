// radius-backend/internal/service/inventory_service.go
package service

import (
	"context"
	"errors"
	"radius/internal/models"
)

type InventoryService struct {
	storeRepo     StoreRepository
	employeeRepo  EmployeeRepository
	sessionRepo   SessionRepository
	inventoryRepo InventoryRepository
	productsRepo  ProductRepository
}

func NewInventoryService(
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
	inventoryRepo InventoryRepository,
	productsRepo ProductRepository,
) *InventoryService {
	return &InventoryService{
		storeRepo:     storeRepo,
		employeeRepo:  employeeRepo,
		sessionRepo:   sessionRepo,
		inventoryRepo: inventoryRepo,
		productsRepo:  productsRepo,
	}
}

func (s *InventoryService) ScanProduct(ctx context.Context, email string, barcode string) (*models.ScanProductResponse, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	product, err := s.inventoryRepo.GetInventoryByBarcode(ctx, employee.StoreId, barcode)
	if err != nil {
		return nil, err
	}

	var productId *int
	if product != nil {
		productId = &product.ProductId
	}

	_ = s.inventoryRepo.LogScan(ctx, models.MimsScanLog{
		StoreId:        employee.StoreId,
		EmployeeId:     employee.EmployeeId,
		ProductId:      productId,
		ScannedBarcode: barcode,
		ScanType:       "MIMS",
	})

	if product == nil {
		return &models.ScanProductResponse{
			Product: nil,
			Message: "No product found for this barcode",
		}, nil
	}

	return &models.ScanProductResponse{
		Product: product,
		Message: "Product found",
	}, nil
}

func (s *InventoryService) GetLocationProducts(ctx context.Context, email string, locationID string) (*models.LocationProductsResponse, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	_ = s.inventoryRepo.LogScan(ctx, models.MimsScanLog{
		StoreId:        employee.StoreId,
		EmployeeId:     employee.EmployeeId,
		ScannedBarcode: locationID,
		MimsLocationId: &locationID,
		ScanType:       "LOCATION",
	})

	exists, err := s.inventoryRepo.CheckLocationExists(ctx, employee.StoreId, locationID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return &models.LocationProductsResponse{
			LocationId: locationID,
			Products:   nil,
			Message:    "Bin location does not exist",
		}, nil
	}

	products, err := s.inventoryRepo.GetProductsByLocation(ctx, employee.StoreId, locationID)
	if err != nil {
		return nil, err
	}

	return &models.LocationProductsResponse{
		LocationId: locationID,
		Products:   products,
		Message:    "Location products retrieved",
	}, nil
}

func (s *InventoryService) BinItem(ctx context.Context, email string, req models.BinItemRequest) (*models.MimsProductInventory, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	exists, err := s.inventoryRepo.CheckLocationExists(ctx, employee.StoreId, req.LocationId)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("location does not exist")
	}

	inventory, err := s.inventoryRepo.GetInventoryByBarcode(ctx, employee.StoreId, req.Barcode)
	if err != nil {
		return nil, err
	}
	if inventory == nil {
		return nil, errors.New("product not found in inventory")
	}

	_ = s.inventoryRepo.LogScan(ctx, models.MimsScanLog{
		StoreId:        employee.StoreId,
		EmployeeId:     employee.EmployeeId,
		ProductId:      &inventory.ProductId,
		ScannedBarcode: req.Barcode,
		MimsLocationId: &req.LocationId,
		ScanType:       "BIN_" + req.Action,
	})

	if req.Action == "OUT" {
		inLocation, err := s.inventoryRepo.CheckProductInLocation(ctx, employee.StoreId, req.LocationId, inventory.ProductId)
		if err != nil {
			return nil, err
		}
		if !inLocation {
			return nil, errors.New("Product is not in this bin")
		}
		err = s.inventoryRepo.IncrementInventoryQuantity(ctx, employee.StoreId, inventory.ProductId, -1)
		if err != nil {
			return nil, err
		}
	} else if req.Action == "IN" {
		err = s.inventoryRepo.LinkProductToLocation(ctx, employee.StoreId, req.LocationId, inventory.ProductId)
		if err != nil {
			return nil, err
		}
		err = s.inventoryRepo.IncrementInventoryQuantity(ctx, employee.StoreId, inventory.ProductId, 1)
		if err != nil {
			return nil, err
		}
	}

	// Return updated product
	return s.inventoryRepo.GetInventoryByBarcode(ctx, employee.StoreId, req.Barcode)
}

func (s *InventoryService) UpdateQuantity(ctx context.Context, email string, req models.UpdateQuantityRequest) error {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return err
	}
	if employee == nil {
		return errors.New("employee not found")
	}
	return s.inventoryRepo.UpdateInventoryQuantity(ctx, employee.StoreId, req.ProductId, req.Quantity)
}
