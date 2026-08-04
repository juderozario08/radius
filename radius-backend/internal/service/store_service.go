// radius-backend/internal/service/store_service.go
package service

import (
	"context"
	"errors"
	"log"
	"radius/internal/models"
	"radius/internal/utils"
	"strconv"
)

type StoreService struct {
	storeRepo    StoreRepository
	employeeRepo EmployeeRepository
	productsRepo ProductRepository
}

func NewStoreService(
	storeRepo StoreRepository,
	employeeRepo EmployeeRepository,
	productsRepo ProductRepository,
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

	if pageSizeInt < utils.PAGING_SIZE_MINIMUM || pageSizeInt > utils.PAGING_SIZE_MAXIMUM {
		pageSizeInt = utils.DEFAULT_PAGING_SIZE // This is just to set a default paging size
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

func (s *StoreService) UpdateStore(ctx context.Context, body models.UpdateStoreRequest) (*models.APIMessage, error) {
	province, postalCode, err := utils.SanitizeLocation(body.Province, body.PostalCode)
	if err != nil {
		return nil, err
	}
	body.Province = province
	body.PostalCode = postalCode

	err = s.storeRepo.UpdateStore(ctx, body)
	if err != nil {
		log.Println("Error: " + err.Error())
		return nil, errors.New("error updating this store")
	}

	return &models.APIMessage{
		Message: "Updated store successfully!",
	}, nil
}

func (s *StoreService) CreateStore(ctx context.Context, body models.CreateStoreRequest) (*models.StoreResponse, error) {
	province, postalCode, err := utils.SanitizeLocation(body.Province, body.PostalCode)
	if err != nil {
		return nil, err
	}
	body.Province = province
	body.PostalCode = postalCode

	store, err := s.storeRepo.CreateStore(ctx, body)
	if err != nil {
		return nil, err
	}

	return &models.StoreResponse{
		Store:   *store,
		Message: "Store created successfully",
	}, nil
}

func (s *StoreService) ActivateStore(ctx context.Context, storeId int) (*models.APIMessage, error) {
	err := s.storeRepo.ActivateStore(ctx, storeId)
	if err != nil {
		return nil, err
	}
	return &models.APIMessage{
		Message: "Store " + strconv.Itoa(storeId) + " activated",
	}, nil
}

func (s *StoreService) DeactivateStore(ctx context.Context, storeId int) (*models.APIMessage, error) {
	err := s.storeRepo.DeactivateStore(ctx, storeId)
	if err != nil {
		return nil, err
	}
	return &models.APIMessage{
		Message: "Store " + strconv.Itoa(storeId) + " deactivated",
	}, nil
}

func (s *StoreService) GetStore(ctx context.Context, storeId string) (*models.StoreResponse, error) {
	id, err := strconv.Atoi(storeId)
	if err != nil {
		return nil, errors.New("Not a valid storeId")
	}

	store, err := s.storeRepo.GetStore(ctx, id)
	if err != nil {
		return nil, err
	}
	return &models.StoreResponse{
		Store:   *store,
		Message: "Successfully retrieved store",
	}, nil
}
