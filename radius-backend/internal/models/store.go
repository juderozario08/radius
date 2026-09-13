package models

import "time"

type StoreBase struct {
	Name       string `json:"name"        binding:"required"`
	Address    string `json:"address"     binding:"required"`
	City       string `json:"city"        binding:"required"`
	Province   string `json:"province"    binding:"required"`
	PostalCode string `json:"postal_code" binding:"required"`
	Phone      string `json:"phone"       binding:"required"`
	Timezone   string `json:"timezone"    binding:"required"`
	IsActive   *bool  `json:"is_active"   binding:"required"`
}

type Store struct {
	StoreId   int       `json:"store_id"`
	CreatedAt time.Time `json:"created_at"`
	StoreBase
}

type CreateStoreRequest struct {
	StoreBase
}

type GetAllStoresResponse struct {
	Stores      []Store `json:"stores"`
	TotalLength int     `json:"total_length"`
	Message     string  `json:"message"`
}

type UpdateStoreRequest struct {
	StoreId int `json:"store_id" binding:"required"`
	StoreBase
}

type StoreResponse struct {
	Store   Store  `json:"store"`
	Message string `json:"message"`
}

type StoreIdRequest struct {
	StoreId int `json:"store_id" binding:"required"`
}

type StoreOperationSummary struct {
	StoreID             int    `json:"store_id"`
	Name                string `json:"name"`
	Address             string `json:"address"`
	City                string `json:"city"`
	Province            string `json:"province"`
	IsActive            bool   `json:"is_active"`
	IsHeadOffice        bool   `json:"is_head_office"`
	ActiveOrdersCount   int    `json:"active_orders_count"`
	ActiveCountsCount   int    `json:"active_counts_count"`
	PendingPosCount     int    `json:"pending_pos_count"`
	HasActiveOperations bool   `json:"has_active_operations"`
}
