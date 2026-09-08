package service

import (
	"context"
	"radius/internal/models"
	"time"
)

type EmployeeRepository interface {
	GetEmployeeByEmail(ctx context.Context, email string) (*models.Employee, error)
	GetEmployeeById(ctx context.Context, id int) (*models.Employee, error)
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
	CreateTransaction(ctx context.Context, storeID int, employeeID *int, req models.CreateTransactionRequest) (*models.Transaction, []models.TransactionItem, error)
	GetAllTransactions(ctx context.Context, limit, offset int, storeID *int) ([]models.Transaction, int, error)
	GetTransactionByID(ctx context.Context, id int, storeID *int) (*models.Transaction, []models.TransactionItem, error)
	GetProductTransactions(ctx context.Context, sku int)
}

type OrdersRepository interface {
	GetAllOnlineOrders(ctx context.Context, limit, offset int, storeID *int, criteria models.OrderSearchCriteria) ([]models.OnlineOrder, int, error)
	GetOnlineOrderByID(ctx context.Context, id int, storeID *int) (*models.OnlineOrder, []models.OnlineOrderItem, error)
	CreateOnlineOrder(ctx context.Context, order *models.OnlineOrder) (*models.OnlineOrder, error)
	AssignOnlineOrder(ctx context.Context, orderID int, employeeID *int, storeID *int, force bool) (*models.OnlineOrder, bool, error)
	UpdateOnlineOrderItem(ctx context.Context, orderID, itemID int, pickedQty *int, status string, reason *string) error
	UpdateOnlineOrderStatus(ctx context.Context, orderID int, status models.OnlineOrderStatus, cancellationReason *string) (*models.OnlineOrder, error)
	AutoCancelExpiredBOPISOrders(ctx context.Context, olderThan time.Duration) ([]models.OnlineOrder, error)
	GetAllPrintOrders(ctx context.Context, limit, offset int, storeID *int, criteria models.PrintOrderSearchCriteria) ([]models.PrintOrder, int, error)
	GetPrintOrderByID(ctx context.Context, id int, storeID *int) (*models.PrintOrder, []models.PrintOrderItem, error)
}

type InventoryRepository interface {
	GetInventoryByBarcode(ctx context.Context, storeID int, barcode string) (*models.MimsProductInventory, error)
	GetProductsByLocation(ctx context.Context, storeID int, locationID string) ([]models.MimsProductInventory, error)
	LogScan(ctx context.Context, log models.MimsScanLog) error
	CheckLocationExists(ctx context.Context, storeID int, locationID string) (bool, error)
	CheckProductInLocation(ctx context.Context, storeID int, locationID string, productID int) (bool, error)
	LinkProductToLocation(ctx context.Context, storeID int, locationID string, productID int) error
	IncrementInventoryQuantity(ctx context.Context, storeID int, productID int, delta int) error
	UpdateInventoryQuantity(ctx context.Context, storeID int, productID int, quantity int) error
	GetProductScreenDetails(ctx context.Context, storeID int, productID int) (*models.ProductScreenDetails, error)
	SyncLocations(ctx context.Context, storeID int, inventoryID int, locations []models.MimsLocationItem) error
	CreateMimsLocation(ctx context.Context, storeID int, locationID string) error
	CreateInventoryAdjustment(ctx context.Context, adj models.InventoryAdjustment) error
	GetPendingAdjustments(ctx context.Context, storeID int) ([]models.PendingAdjustmentDetail, error)
	ReviewAdjustments(ctx context.Context, storeID int, reviewerID int, reviews []models.ReviewAdjustmentItem) error
}

type ProductRepository interface {
	GetProductByID(ctx context.Context, id int) (*models.Product, error)
	GetProductByBarcode(ctx context.Context, barcode string) (*models.Product, error)
	SearchProducts(ctx context.Context, query string, categoryID *int, brand *string, isActive *bool, unitOfMeasure *string, limit, offset int) ([]models.Product, int, error)
}

type CategoryRepository interface {
	GetAllCategories(ctx context.Context) ([]models.Category, error)
	GetDistinctBrands(ctx context.Context) ([]string, error)
}

type MerchandisingRepository interface {
	// Add merchandising repository methods here when implemented
}

type FillReportRepository interface {
	GetActiveFillReportForStore(ctx context.Context, storeID int, filter models.FillReportFilter) (*models.FillReport, []models.FillReportItemDetail, error)
	AddEmptyHole(ctx context.Context, storeID int, productID int, employeeID *int) error
	AddSoldItems(ctx context.Context, storeID int, items []models.TransactionItem) error
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
	GetSessionsByEmployeeId(ctx context.Context, employeeId int) ([]models.Session, error)
	GetAllSessions(ctx context.Context, limit, offset int) ([]models.GetAllSessions, int, error)
	TerminateExpiredSessions(ctx context.Context) (int64, error)
}

type ReceivingRepository interface {
	GetPurchaseOrders(ctx context.Context, storeID *int) ([]models.PurchaseOrderSummary, error)
	GetPurchaseOrderDetail(ctx context.Context, poID int) (*models.PurchaseOrderDetailResponse, error)
	CheckProductInPO(ctx context.Context, poID int, barcode string) (*models.PurchaseOrderItemDetail, error)
	ReceivePOItems(ctx context.Context, storeID int, poID int, employeeID int, items []models.ReceivePOItemEntry) error
	ReceiveLPR(ctx context.Context, storeID int, poID int, lprBarcode string, employeeID int) error
	GetStockTransfers(ctx context.Context, storeID *int) ([]models.StockTransferSummary, error)
	GetStockTransferDetail(ctx context.Context, transferID int) (*models.StockTransferDetailResponse, error)
	CheckProductInTransfer(ctx context.Context, transferID int, barcode string) (*models.StockTransferItemDetail, error)
	ReceiveTransferItems(ctx context.Context, storeID int, transferID int, employeeID int, items []models.ReceiveTransferItemEntry) error
	QuickReceiveTransfer(ctx context.Context, storeID int, transferID int, employeeID int) error
}

type AuditRepository interface {
	GetProductAuditTrail(ctx context.Context, productID int, storeID *int, filter models.AuditFilter, limit, offset int) ([]models.AuditTrailEntry, int, error)
}

type CycleCountRepository interface {
	GetWeeklyCycleCounts(ctx context.Context, storeID int) ([]models.CycleCountSummary, error)
	GetCycleCountByID(ctx context.Context, countID int, storeID int) (*models.CycleCount, error)
	GetCycleCountItems(ctx context.Context, countID int) ([]models.CycleCountItemDetail, error)
	StartCycleCount(ctx context.Context, storeID int, categoryID int, employeeID int) (*models.CycleCount, error)
	AutoAssignCycleCount(ctx context.Context, countID int, storeID int, employeeID int) (*models.CycleCount, error)
	RecordScan(ctx context.Context, storeID int, req models.RecordScanRequest, employeeID int) (*models.CycleCountItemDetail, error)
	SubmitForApproval(ctx context.Context, storeID int, countID int, notes *string) error
	ApproveCycleCount(ctx context.Context, storeID int, countID int, approverID int) error
	TransferOwnership(ctx context.Context, storeID int, countID int, newEmployeeID int) error
	SearchCycleCounts(ctx context.Context, storeID int, criteria models.CycleCountSearchCriteria) ([]models.CycleCountSummary, error)
	GetSchedule(ctx context.Context, storeID int, fromDate time.Time, toDate time.Time) ([]models.CycleCountScheduleEntry, error)
	CreateScheduleEntry(ctx context.Context, storeID int, categoryID int, scheduledDate time.Time, createdBy int) (*models.CycleCountScheduleEntry, error)
}

// EventBroadcaster defines the contract for broadcasting real-time WebSocket events.
// Implemented by *websocket.Hub in radius-backend/internal/websocket/hub.go.
type EventBroadcaster interface {
	Broadcast(event models.WebSocketEvent)
	BroadcastToStore(storeID int, event models.WebSocketEvent)
}

