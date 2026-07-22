// radius-backend/internal/service/store_service.go
package service

import (
	"context"
	"log"
	"radius/internal/models"
	"radius/internal/repository"
	"strconv"
)

type StoreService struct {
	storeRepo    *repository.StoreRepo
	employeeRepo *repository.EmployeeRepo
	productsRepo *repository.ProductRepo
}

func NewStoreService(
	storeRepo *repository.StoreRepo,
	employeeRepo *repository.EmployeeRepo,
	productsRepo *repository.ProductRepo,
) *StoreService {
	return &StoreService{
		storeRepo:    storeRepo,
		employeeRepo: employeeRepo,
		productsRepo: productsRepo,
	}
}

func (s *StoreService) GetAllStores(ctx context.Context, pageSize string, pageNumber string) (*models.GetAllStoresResponse, error) {
	pageSizeInt := 10
	pageNumberInt := 0

	num, err := strconv.Atoi(pageSize)
	if err != nil {
		log.Println("Page Size atoi conversion failed: ", err)
	} else {
		pageSizeInt = num
	}

	num, err = strconv.Atoi(pageNumber)
	if err != nil {
		log.Println("Page Number atoi conversion failed: ", err)
	} else {
		pageNumberInt = num - 1
	}

	if pageSizeInt < 10 {
		pageSizeInt = 10
	}

	if pageNumberInt < 0 {
		pageNumberInt = 0
	}

	stores, totalLength, err := s.storeRepo.GetAllStores(ctx, pageSizeInt, pageNumberInt)
	if err != nil {
		return nil, err
	}

	return &models.GetAllStoresResponse{
		Stores:      stores,
		TotalLength: totalLength,
		Message:     "Retrieved stores successfully",
	}, nil
}

func (s *StoreService) UpdateStore(ctx context.Context) (*models.UpdateStoreResponse, error) {
	return nil, nil
}

func (s *StoreService) CreateStore(ctx context.Context) (*models.CreateStoreResponse, error) {
	return nil, nil
}

func (s *StoreService) ManageEmployees(ctx context.Context) (*models.ManageEmployeesResponse, error) {
	return nil, nil
}

func (s *StoreService) GetStore(ctx context.Context) (*models.GetStoreResponse, error) {
	return nil, nil
}
