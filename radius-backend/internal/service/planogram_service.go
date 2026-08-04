// radius-backend/internal/service/planogram_service.go
package service

type PlanogramService struct {
	merchandisingRepo MerchandisingRepository
	employeeRepo      EmployeeRepository
	storeRepo         StoreRepository
	sessionRepo       SessionRepository
}

func NewPlanogramService(
	merchandisingRepo MerchandisingRepository,
	employeeRepo EmployeeRepository,
	storeRepo StoreRepository,
	sessionRepo SessionRepository,
) *PlanogramService {
	return &PlanogramService{
		merchandisingRepo: merchandisingRepo,
		employeeRepo:      employeeRepo,
		storeRepo:         storeRepo,
		sessionRepo:       sessionRepo,
	}
}
