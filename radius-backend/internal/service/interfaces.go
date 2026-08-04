package service

import (
	"context"
	"radius/internal/models"
	"time"
)

type EmployeeRepository interface {
	GetEmployeeByEmail(ctx context.Context, email string) (*models.Employee, error)
	GetEmployeeByEmailWithSession(ctx context.Context, email string) (*models.GetEmployeeByEmailWithSession, error)
	GetAllEmployees(ctx context.Context, limit, offset int, storeId *int) ([]models.Employee, int, error)
	CreateEmployee(ctx context.Context, model models.CreateEmployeeRow) (*models.CreateEmployeeResponse, error)
	TerminateEmployeeById(ctx context.Context, id int) error
	ActivateEmployeeById(ctx context.Context, id int) error
	UpdateEmployee(ctx context.Context, body models.Employee) error
}

type StoreRepository interface {
	GetAllStores(ctx context.Context, pageSize int, pageNumber int) ([]models.Store, int, error)
	UpdateStore(ctx context.Context, body models.UpdateStoreRequest) error
	CreateStore(ctx context.Context, body models.CreateStoreRequest) (*models.Store, error)
	ActivateStore(ctx context.Context, storeId int) error
	DeactivateStore(ctx context.Context, storeId int) error
	GetStore(ctx context.Context, storeId int) (*models.Store, error)
}

type SalesRepository interface {
	CreateTransaction(ctx context.Context)
	GetAllTransactions(ctx context.Context, limit, offset int, storeID *int) ([]models.Transaction, int, error)
	GetTransactionByID(ctx context.Context, id int, storeID *int) (*models.Transaction, []models.TransactionItem, error)
	GetProductTransactions(ctx context.Context, sku int)
}

type OrdersRepository interface {
	GetAllOnlineOrders(ctx context.Context, limit, offset int, storeID *int) ([]models.OnlineOrder, int, error)
	GetOnlineOrderByID(ctx context.Context, id int, storeID *int) (*models.OnlineOrder, []models.OnlineOrderItem, error)
}

type InventoryRepository interface {
	GetProductBySku(ctx context.Context, sku int) (*models.Product, error)
	GetProductByUpc(ctx context.Context, upc string) (*models.Product, error)
	CreateInventoryItem(ctx context.Context, model models.Inventory) (*models.Inventory, error)
	DeleteProductBySku(ctx context.Context, sku int) (*models.Product, error)
}

type ProductRepository interface {
	// Add product repository methods here when implemented
}

type MerchandisingRepository interface {
	// Add merchandising repository methods here when implemented
}

type SessionRepository interface {
	GetSessionByAccessTokenHash(ctx context.Context, accessTokenHash string) (*models.GetSessionByHashedToken, error)
	GetSessionByRefreshTokenHash(ctx context.Context, refreshTokenHash string) (*models.GetSessionByHashedToken, error)
	GetSessionById(ctx context.Context, id int) (*models.Session, error)
	TerminateSessionById(ctx context.Context, id int) error
	TerminateSessionByAccessTokenHash(ctx context.Context, accessTokenHash string) error
	UpdateAccessTokenHash(ctx context.Context, sessionId int, newAccessTokenHash string) error
	UpdateSessionExpiry(ctx context.Context, sessionId int, newExpiresAt time.Time) error
	CreateSession(ctx context.Context, model models.CreateSessionRequest) (*models.CreateSessionResponse, error)
	GetAllSessions(ctx context.Context, limit, offset int) ([]models.GetAllSessions, int, error)
	TerminateExpiredSessions(ctx context.Context) (int64, error)
}
