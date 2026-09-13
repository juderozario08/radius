package service

import (
	"context"
	"errors"
	"radius/internal/models"
)

type AuditService struct {
	auditRepo    AuditRepository
	employeeRepo EmployeeRepository
	productRepo  ProductRepository
}

func NewAuditService(ar AuditRepository, er EmployeeRepository, pr ProductRepository) *AuditService {
	return &AuditService{
		auditRepo:    ar,
		employeeRepo: er,
		productRepo:  pr,
	}
}

func (s *AuditService) GetProductAuditTrail(ctx context.Context, email string, barcode string, filter models.AuditFilter, limit, offset int) (*models.AuditTrailResponse, error) {
	employee, err := s.employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	product, err := s.productRepo.GetProductByBarcode(ctx, barcode)
	if err != nil {
		return nil, err
	}
	if product == nil {
		return nil, errors.New("product not found")
	}

	var storeID *int
	if employee.Role != "ADMIN" {
		storeID = &employee.StoreId
	} else if filter.StoreId != nil {
		storeID = filter.StoreId
	}

	events, total, err := s.auditRepo.GetProductAuditTrail(ctx, product.ProductId, storeID, filter, limit, offset)
	if err != nil {
		return nil, err
	}

	return &models.AuditTrailResponse{
		Product: *product,
		Events:  events,
		Total:   total,
	}, nil
}
