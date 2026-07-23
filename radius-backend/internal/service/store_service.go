// radius-backend/internal/service/store_service.go
package service

import (
	"context"
	"errors"
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

func (s *StoreService) UpdateStore(ctx context.Context, body models.UpdateStoreRequest) (*models.UpdateStoreResponse, error) {
	err := s.storeRepo.UpdateStore(ctx, body)
	if err != nil {
		log.Println("Error: " + err.Error())
		return nil, errors.New("error updating this store")
	}

	return &models.UpdateStoreResponse{
		Message: "Updated store successfully!",
	}, nil
}

func (s *StoreService) CreateStore(ctx context.Context, body models.CreateStoreRequest) (*models.CreateStoreResponse, error) {
	err := s.storeRepo.CreateStore(ctx, body)
	if err != nil {
		return nil, err
	}

	return &models.CreateStoreResponse{
		Message: "Store created successfully",
	}, nil
}

func (s *StoreService) ActivateStore(ctx context.Context, storeId int) (*models.ActivateStoreResponse, error) {
	err := s.storeRepo.ActivateStore(ctx, storeId)
	if err != nil {
		return nil, err
	}
	return &models.ActivateStoreResponse{
		Message: "Store " + strconv.Itoa(storeId) + " activated",
	}, nil
}

func (s *StoreService) DeactivateStore(ctx context.Context, storeId int) (*models.DeactivateStoreResponse, error) {
	err := s.storeRepo.DeactivateStore(ctx, storeId)
	if err != nil {
		return nil, err
	}
	return &models.DeactivateStoreResponse{
		Message: "Store " + strconv.Itoa(storeId) + " deactivated",
	}, nil
}

func (s *StoreService) GetStore(ctx context.Context, storeId string) (*models.GetStoreResponse, error) {
	id, err := strconv.Atoi(storeId)
	if err != nil {
		return nil, errors.New("Not a valid storeId")
	}

	store, err := s.storeRepo.GetStore(ctx, id)
	if err != nil {
		return nil, err
	}
	return &models.GetStoreResponse{
		Store:   *store,
		Message: "Successfully retrieved store",
	}, nil
}
