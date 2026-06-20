package models

import "time"

type Inventory struct {
	InventoryId   int        `json:"inventory_id"`
	StoreId       int        `json:"store_id"`
	ProductId     int        `json:"product_id"`
	OnHandQty     int        `json:"on_hand_qty"`
	ReservedQty   int        `json:"reserved_qty"`
	ReorderQty    int        `json:"reorder_qty"`
	Aisle         *string    `json:"aisle"`
	MimsLocation  *string    `json:"mims_location"`
	LastCountedAt *time.Time `json:"last_counted_at"`
	UpdatedAt     *time.Time `json:"updated_at"`
	AvailableQty  int        `json:"available_qty"`
}

type TransferStatus string

const (
	TransferStatusPending   TransferStatus = "PENDING"
	TransferStatusInTransit TransferStatus = "IN_TRANSIT"
	TransferStatusReceived  TransferStatus = "RECEIVED"
	TransferStatusCancelled TransferStatus = "CANCELLED"
)

type StockTransfer struct {
	TransferId  int            `json:"transfer_id"`
	FromStoreId int            `json:"from_store_id"`
	ToStoreId   int            `json:"to_store_id"`
	Status      TransferStatus `json:"status"`
	RequestedBy int            `json:"requested_by"`
	CreatedAt   time.Time      `json:"created_at"`
	ReceivedAt  *time.Time     `json:"received_at"`
}

type StockTransferItem struct {
	TransferItemId int  `json:"transfer_item_id"`
	TransferId     int  `json:"transfer_id"`
	ProductId      int  `json:"product_id"`
	QtyRequested   int  `json:"qty_requested"`
	QtySent        *int `json:"qty_sent"`
	QtyReceived    *int `json:"qty_received"`
}

type DetectedBy string
type Resolution string

const (
	DetectedByEmployee DetectedBy = "EMPLOYEE"
	DetectedBySystem   DetectedBy = "SYSTEM"
)

const (
	ResolutionRestocked    Resolution = "RESTOCKED"
	ResolutionDiscontinued Resolution = "DISCONTINUED"
	ResolutionRelocated    Resolution = "RELOCATED"
)

type OutOfStockLog struct {
	OOSId                int         `json:"oos_id"`
	StoreId              int         `json:"store_id"`
	ProductId            int         `json:"product_id"`
	DetectedAt           time.Time   `json:"detected_at"`
	DetectedBy           DetectedBy  `json:"detected_by"`
	EmployeeId           *int        `json:"employee_id"`
	ResolvedAt           *time.Time  `json:"resolved_at"`
	Resolution           *Resolution `json:"resolution"`
	AutoReorderTriggered bool        `json:"auto_reorder_triggered"`
	Notes                *string     `json:"notes"`
}

type CycleCountStatus string

const (
	CycleCountStatusNotStarted CycleCountStatus = "NOT STARTED"
	CycleCountStatusInProgress CycleCountStatus = "IN PROGRESS"
	CycleCountStatusCompleted  CycleCountStatus = "COMPLETED"
)

type CycleCount struct {
	CountId    int              `json:"count_id"`
	StoreId    int              `json:"store_id"`
	CountDate  *time.Time       `json:"count_date"`
	CategoryId int              `json:"category_id"`
	Status     CycleCountStatus `json:"status"`
	CountedBy  *int             `json:"counted_by"`
}

type CycleCountItem struct {
	CountItemId int `json:"count_item_id"`
	CountId     int `json:"count_id"`
	ProductId   int `json:"product_id"`
	ExpectedQty int `json:"expected_qty"`
	CountedQty  int `json:"counted_qty"`
	Variance    int `json:"variance"`
}
