// radius-backend/internal/service/pos_service.go
package service

type POSService struct {
	salesRepo    SalesRepository
	employeeRepo EmployeeRepository
	sessionRepo  SessionRepository
	storeRepo    StoreRepository
}

func NewPOSService(
	salesRepo SalesRepository,
	employeeRepo EmployeeRepository,
	sessionRepo SessionRepository,
	storeRepo StoreRepository,
) *POSService {
	return &POSService{
		salesRepo:    salesRepo,
		employeeRepo: employeeRepo,
		sessionRepo:  sessionRepo,
		storeRepo:    storeRepo,
	}
}
