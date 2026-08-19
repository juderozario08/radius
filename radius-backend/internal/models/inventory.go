//radius-backend/internal/models/inventory.go
package models

import "time"

type Inventory struct {
	InventoryId   int        `json:"inventory_id"`
	StoreId       int        `json:"store_id"`
	ProductId     int        `json:"product_id"`
	OnHandQty          int        `json:"on_hand_qty"`
	ReservedQty        int        `json:"reserved_qty"`
	ReorderQty         int        `json:"reorder_qty"`
	Aisle              *string    `json:"aisle"`
	MimsLocation       *string    `json:"mims_location"`
	LastCountedAt      *time.Time `json:"last_counted_at"`
	UpdatedAt          *time.Time `json:"updated_at"`
	AvailableQty       int        `json:"available_qty"`
	OpenBoxQty         int        `json:"open_box_qty"`
	NewQty             int        `json:"new_qty"`
	RtvQty             int        `json:"rtv_qty"`
	Code88Qty          int        `json:"code88_qty"`
	BopisQty           int        `json:"bopis_qty"`
	QuarantineQty      int        `json:"quarantine_qty"`
	RepairQty          int        `json:"repair_qty"`
	CustomerOnHoldQty  int        `json:"customer_on_hold_qty"`
	FcOnHoldQty        int        `json:"fc_on_hold_qty"`
	VerifyQty          int        `json:"verify_qty"`
	DemoQty            int        `json:"demo_qty"`
	OnOrderQty         int        `json:"on_order_qty"`
	LastReceivedAt     *time.Time `json:"last_received_at"`
}

type MimsLocationItem struct {
	MimsLocationId *string `json:"mims_location_id"`
	StoreId        int     `json:"store_id"`
	InventoryId    int     `json:"inventory_id"`
	Quantity       int     `json:"quantity"`
	LocationType   string  `json:"location_type"`
}

type ProductScreenDetails struct {
	Product       Product            `json:"product"`
	Inventory     Inventory          `json:"inventory"`
	Locations     []MimsLocationItem `json:"locations"`
	PlanogramInfo *Planogram         `json:"planogram_info"`
}

type MimsScanLog struct {
	ScanId          int       `json:"scan_id"`
	StoreId         int       `json:"store_id"`
	EmployeeId      int       `json:"employee_id"`
	ProductId       *int      `json:"product_id"`
	ScannedBarcode  string    `json:"scanned_barcode"`
	MimsLocationId  *string   `json:"mims_location_id"`
	ScanType        string    `json:"scan_type"`
	ScannedAt       time.Time `json:"scanned_at"`
}

type MimsProductInventory struct {
	ProductId     int        `json:"product_id"`
	Sku           string     `json:"sku"`
	Upc           string     `json:"upc"`
	Name          string     `json:"name"`
	Brand         string     `json:"brand"`
	Description   *string    `json:"description"`
	UnitOfMeasure string     `json:"unit_of_measure"`
	UnitsPerCase  int        `json:"units_per_case"`
	Weight        float32    `json:"weight"`
	IsActive      bool       `json:"is_active"`
	OnHandQty     int        `json:"on_hand_qty"`
	ReservedQty   int        `json:"reserved_qty"`
	AvailableQty  int        `json:"available_qty"`
	ReorderQty    int        `json:"reorder_qty"`
	Aisle         *string    `json:"aisle"`
	MimsLocation  *string    `json:"mims_location"`
	LastCountedAt *time.Time `json:"last_counted_at"`
}

type BinItemRequest struct {
	Barcode    string `json:"barcode" binding:"required"`
	LocationId string `json:"location_id" binding:"required"`
	Action     string `json:"action" binding:"required,oneof=IN OUT"`
}

type UpdateQuantityRequest struct {
	ProductId int `json:"product_id" binding:"required"`
	Quantity  int `json:"quantity"`
}

type SyncLocationsRequest struct {
	InventoryId int                `json:"inventory_id" binding:"required"`
	Locations   []MimsLocationItem `json:"locations" binding:"required"`
}

type ScanProductResponse struct {
	Product   *MimsProductInventory `json:"product"`
	Message   string                `json:"message"`
}

type LocationProductsResponse struct {
	LocationId string                  `json:"location_id"`
	Products   []MimsProductInventory  `json:"products"`
	Message    string                  `json:"message"`
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

// ---- Receiving Models ----

// PO list item (for the PO tab list)
type PurchaseOrderSummary struct {
	PoId         int        `json:"po_id"`
	StoreId      int        `json:"store_id"`
	StoreName    string     `json:"store_name"`
	SupplierName string     `json:"supplier_name"`
	Status       string     `json:"status"`
	ItemCount    int        `json:"item_count"`
	OrderedAt    time.Time  `json:"ordered_at"`
	ExpectedAt   *time.Time `json:"expected_at"`
	ArrivedAt    *time.Time `json:"arrived_at"`
	HasLprs      bool       `json:"has_lprs"`
}

// PO item detail (for Scanner/List tabs)
type PurchaseOrderItemDetail struct {
	PoItemId    int     `json:"po_item_id"`
	ProductId   int     `json:"product_id"`
	Sku         string  `json:"sku"`
	Upc         string  `json:"upc"`
	Name        string  `json:"name"`
	Brand       string  `json:"brand"`
	QtyOrdered  int     `json:"qty_ordered"`
	QtyReceived int     `json:"qty_received"`
	UnitCost    float64 `json:"unit_cost"`
}

// LPR detail
type PurchaseOrderLPR struct {
	LprId      int        `json:"lpr_id"`
	LprBarcode string     `json:"lpr_barcode"`
	IsReceived bool       `json:"is_received"`
	ReceivedAt *time.Time `json:"received_at"`
}

// Full PO detail response
type PurchaseOrderDetailResponse struct {
	PoId         int                       `json:"po_id"`
	StoreId      int                       `json:"store_id"`
	SupplierName string                    `json:"supplier_name"`
	Status       string                    `json:"status"`
	OrderedAt    time.Time                 `json:"ordered_at"`
	ExpectedAt   *time.Time                `json:"expected_at"`
	ArrivedAt    *time.Time                `json:"arrived_at"`
	HasLprs      bool                      `json:"has_lprs"`
	Items        []PurchaseOrderItemDetail `json:"items"`
	Lprs         []PurchaseOrderLPR        `json:"lprs"`
}

// Receive request — batch of items
type ReceivePORequest struct {
	PoId  int                  `json:"po_id" binding:"required"`
	Items []ReceivePOItemEntry `json:"items" binding:"required,min=1"`
}

type ReceivePOItemEntry struct {
	PoItemId    int `json:"po_item_id" binding:"required"`
	QtyReceived int `json:"qty_received" binding:"required,min=1"`
}

// LPR receive request
type ReceiveLPRRequest struct {
	PoId       int    `json:"po_id" binding:"required"`
	LprBarcode string `json:"lpr_barcode" binding:"required"`
}

// Transfer list item
type StockTransferSummary struct {
	TransferId          int       `json:"transfer_id"`
	FromStoreId         int       `json:"from_store_id"`
	FromStoreName       string    `json:"from_store_name"`
	ToStoreId           int       `json:"to_store_id"`
	ToStoreName         string    `json:"to_store_name"`
	Status              string    `json:"status"`
	ManualCheckRequired bool      `json:"manual_check_required"`
	ItemCount           int       `json:"item_count"`
	CreatedAt           time.Time `json:"created_at"`
}

// Transfer detail response
type StockTransferDetailResponse struct {
	TransferId          int                       `json:"transfer_id"`
	FromStoreName       string                    `json:"from_store_name"`
	ToStoreName         string                    `json:"to_store_name"`
	Status              string                    `json:"status"`
	ManualCheckRequired bool                      `json:"manual_check_required"`
	CreatedAt           time.Time                 `json:"created_at"`
	Items               []StockTransferItemDetail `json:"items"`
}

type StockTransferItemDetail struct {
	TransferItemId int    `json:"transfer_item_id"`
	ProductId      int    `json:"product_id"`
	Sku            string `json:"sku"`
	Upc            string `json:"upc"`
	Name           string `json:"name"`
	Brand          string `json:"brand"`
	QtyRequested   int    `json:"qty_requested"`
	QtySent        *int   `json:"qty_sent"`
	QtyReceived    *int   `json:"qty_received"`
}

// Receive transfer request — batch
type ReceiveTransferRequest struct {
	TransferId int                        `json:"transfer_id" binding:"required"`
	Items      []ReceiveTransferItemEntry `json:"items" binding:"required,min=1"`
}

type ReceiveTransferItemEntry struct {
	TransferItemId int `json:"transfer_item_id" binding:"required"`
	QtyReceived    int `json:"qty_received" binding:"required,min=1"`
}

// Quick receive (non-manual-check transfers)
type QuickReceiveTransferRequest struct {
	TransferId int `json:"transfer_id" binding:"required"`
}

// Check product in PO response
type CheckProductInPOResponse struct {
	Found bool                     `json:"found"`
	Item  *PurchaseOrderItemDetail `json:"item"`
}

// Check product in transfer response
type CheckProductInTransferResponse struct {
	Found bool                     `json:"found"`
	Item  *StockTransferItemDetail `json:"item"`
}

type CreateMimsLocationRequest struct {
	LocationId string `json:"location_id" binding:"required"`
}

type AdjustInventoryRequest struct {
	InventoryId int    `json:"inventory_id" binding:"required"`
	ProductId   int    `json:"product_id" binding:"required"`
	PreviousQty int    `json:"previous_qty"`
	AdjustedQty int    `json:"adjusted_qty" binding:"required"`
	Reason      string `json:"reason"`
}

type AdjustmentStatus string

const (
	AdjustmentStatusPending  AdjustmentStatus = "PENDING"
	AdjustmentStatusApproved AdjustmentStatus = "APPROVED"
	AdjustmentStatusRejected AdjustmentStatus = "REJECTED"
	AdjustmentStatusWriteOff AdjustmentStatus = "WRITE_OFF"
)

type InventoryAdjustment struct {
	AdjustmentId int              `json:"adjustment_id"`
	StoreId      int              `json:"store_id"`
	InventoryId  int              `json:"inventory_id"`
	ProductId    int              `json:"product_id"`
	PreviousQty  int              `json:"previous_qty"`
	AdjustedQty  int              `json:"adjusted_qty"`
	Reason       string           `json:"reason"`
	Status       AdjustmentStatus `json:"status"`
	RequestedBy  int              `json:"requested_by"`
	ReviewedBy   *int             `json:"reviewed_by"`
	CreatedAt    time.Time        `json:"created_at"`
	ReviewedAt   *time.Time       `json:"reviewed_at"`
}

type PendingAdjustmentDetail struct {
	AdjustmentId int       `json:"adjustment_id"`
	InventoryId  int       `json:"inventory_id"`
	ProductId    int       `json:"product_id"`
	PreviousQty  int       `json:"previous_qty"`
	AdjustedQty  int       `json:"adjusted_qty"`
	Reason       string    `json:"reason"`
	RequestedBy  string    `json:"requested_by"`
	CreatedAt    time.Time `json:"created_at"`
	Name         string    `json:"name"`
	Sku          string    `json:"sku"`
	Upc          string    `json:"upc"`
}

type ReviewAdjustmentItem struct {
	AdjustmentId int              `json:"adjustment_id" binding:"required"`
	Status       AdjustmentStatus `json:"status" binding:"required"`
	AdjustedQty  *int             `json:"adjusted_qty"`
	Reason       *string          `json:"reason"`
}

type ReviewAdjustmentRequest struct {
	Reviews []ReviewAdjustmentItem `json:"reviews" binding:"required,min=1"`
}
