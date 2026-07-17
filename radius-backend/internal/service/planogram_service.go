//radius-backend/internal/service/planogram_service.go
package service

import "radius/internal/repository"

type PlanogramService struct {
	merchandisingRepo *repository.MerchandisingRepo
	employeeRepo      *repository.EmployeeRepo
	storeRepo         *repository.StoreRepo
	sessionRepo       *repository.SessionRepo
}

func NewPlanogramService(
	merchandisingRepo *repository.MerchandisingRepo,
	employeeRepo *repository.EmployeeRepo,
	storeRepo *repository.StoreRepo,
	sessionRepo *repository.SessionRepo,
) *PlanogramService {
	return &PlanogramService{
		merchandisingRepo: merchandisingRepo,
		employeeRepo:      employeeRepo,
		storeRepo:         storeRepo,
		sessionRepo:       sessionRepo,
	}
}
