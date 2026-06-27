package service

import "radius/internal/repository"

type OnlineOrderService struct {
	ordersRepo    *repository.OrdersRepo
	productsRepo  *repository.ProductRepo
	inventoryRepo *repository.InventoryRepo
	sessionRepo   *repository.SessionRepo
	storeRepo     *repository.StoreRepo
}

func NewOnlineOrderService(
	ordersRepo *repository.OrdersRepo,
	productsRepo *repository.ProductRepo,
	inventoryRepo *repository.InventoryRepo,
	sessionRepo *repository.SessionRepo,
	storeRepo *repository.StoreRepo,
) *OnlineOrderService {
	return &OnlineOrderService{
		ordersRepo:    ordersRepo,
		productsRepo:  productsRepo,
		inventoryRepo: inventoryRepo,
		sessionRepo:   sessionRepo,
		storeRepo:     storeRepo,
	}
}
