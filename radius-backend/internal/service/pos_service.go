package service

import "radius/internal/repository"

type POSService struct {
	salesRepo    *repository.SalesRepo
	employeeRepo *repository.EmployeeRepo
	sessionRepo  *repository.SessionRepo
	storeRepo    *repository.StoreRepo
}

func NewPOSService(
	salesRepo *repository.SalesRepo,
	employeeRepo *repository.EmployeeRepo,
	sessionRepo *repository.SessionRepo,
	storeRepo *repository.StoreRepo,
) *POSService {
	return &POSService{
		salesRepo:    salesRepo,
		employeeRepo: employeeRepo,
		sessionRepo:  sessionRepo,
		storeRepo:    storeRepo,
	}
}
