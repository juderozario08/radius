package models

import "time"

type ReturnStatus string

const (
	ReturnStatusPendingApproval ReturnStatus = "PENDING_APPROVAL"
	ReturnStatusApproved        ReturnStatus = "APPROVED"
	ReturnStatusCompleted       ReturnStatus = "COMPLETED"
	ReturnStatusRejected        ReturnStatus = "REJECTED"
)

type ReturnDisposition string

const (
	ReturnDispositionRestock          ReturnDisposition = "RESTOCK"
	ReturnDispositionOpenBox          ReturnDisposition = "OPEN_BOX"
	ReturnDispositionDefectiveRtv     ReturnDisposition = "DEFECTIVE_RTV"
	ReturnDispositionDamagedWriteOff  ReturnDisposition = "DAMAGED_WRITE_OFF"
	ReturnDispositionQuarantine       ReturnDisposition = "QUARANTINE"
)

type RefundMethod string

const (
	RefundMethodCash        RefundMethod = "CASH"
	RefundMethodCard        RefundMethod = "CARD"
	RefundMethodGiftCard    RefundMethod = "GIFT CARD"
	RefundMethodStoreCredit RefundMethod = "STORE_CREDIT"
)

type RtvStatus string

const (
	RtvStatusQueued   RtvStatus = "QUEUED"
	RtvStatusApproved RtvStatus = "APPROVED"
	RtvStatusShipped  RtvStatus = "SHIPPED"
	RtvStatusCredited RtvStatus = "CREDITED"
	RtvStatusRejected RtvStatus = "REJECTED"
)

type CustomerReturn struct {
	ReturnId              int          `json:"return_id"`
	StoreId               int          `json:"store_id"`
	OriginalTransactionId *int64       `json:"original_transaction_id"`
	EmployeeId            int          `json:"employee_id"`
	Status                ReturnStatus `json:"status"`
	RefundMethod          RefundMethod `json:"refund_method"`
	Subtotal              float64      `json:"subtotal"`
	TaxAmount             float64      `json:"tax_amount"`
	TotalRefund           float64      `json:"total_refund"`
	IsStoreCredit         bool         `json:"is_store_credit"`
	Notes                 *string      `json:"notes"`
	ApprovedBy            *int         `json:"approved_by"`
	ApprovedAt            *time.Time   `json:"approved_at"`
	CreatedAt             time.Time    `json:"created_at"`
	CompletedAt           *time.Time   `json:"completed_at"`
}

type CustomerReturnItem struct {
	ReturnItemId                int               `json:"return_item_id"`
	ReturnId                    int               `json:"return_id"`
	ProductId                   int               `json:"product_id"`
	OriginalTransactionItemId   *int64            `json:"original_transaction_item_id"`
	Quantity                    int               `json:"quantity"`
	UnitPrice                   float64           `json:"unit_price"`
	UnitCost                    float64           `json:"unit_cost"`
	TaxAmount                   float64           `json:"tax_amount"`
	ReturnReason                string            `json:"return_reason"`
	Disposition                 ReturnDisposition `json:"disposition"`
	CreatedAt                   time.Time         `json:"created_at"`
}

type CustomerReturnItemDetail struct {
	ReturnItemId              int               `json:"return_item_id"`
	ReturnId                  int               `json:"return_id"`
	ProductId                 int               `json:"product_id"`
	ProductName               string            `json:"product_name"`
	Sku                       string            `json:"sku"`
	Upc                       string            `json:"upc"`
	Brand                     string            `json:"brand"`
	OriginalTransactionItemId *int64            `json:"original_transaction_item_id"`
	Quantity                  int               `json:"quantity"`
	UnitPrice                 float64           `json:"unit_price"`
	UnitCost                  float64           `json:"unit_cost"`
	TaxAmount                 float64           `json:"tax_amount"`
	ReturnReason              string            `json:"return_reason"`
	Disposition               ReturnDisposition `json:"disposition"`
	CreatedAt                 time.Time         `json:"created_at"`
}

type CustomerReturnSummary struct {
	ReturnId              int          `json:"return_id"`
	StoreId               int          `json:"store_id"`
	StoreName             string       `json:"store_name"`
	OriginalTransactionId *int64       `json:"original_transaction_id"`
	EmployeeId            int          `json:"employee_id"`
	EmployeeName          string       `json:"employee_name"`
	Status                ReturnStatus `json:"status"`
	RefundMethod          RefundMethod `json:"refund_method"`
	TotalRefund           float64      `json:"total_refund"`
	ItemCount             int          `json:"item_count"`
	IsStoreCredit         bool         `json:"is_store_credit"`
	CreatedAt             time.Time    `json:"created_at"`
	ApprovedByName        *string      `json:"approved_by_name"`
}

type CustomerReturnDetailResponse struct {
	Return CustomerReturnSummary      `json:"return"`
	Items  []CustomerReturnItemDetail `json:"items"`
}

type RtvQueueItem struct {
	RtvId        int        `json:"rtv_id"`
	ReturnItemId int        `json:"return_item_id"`
	StoreId      int        `json:"store_id"`
	ProductId    int        `json:"product_id"`
	ProductName  string     `json:"product_name"`
	Sku          string     `json:"sku"`
	Upc          string     `json:"upc"`
	Quantity     int        `json:"quantity"`
	Status       RtvStatus  `json:"status"`
	SupplierId   *int       `json:"supplier_id"`
	SupplierName *string    `json:"supplier_name"`
	ReviewedBy   *int       `json:"reviewed_by"`
	ReviewedAt   *time.Time `json:"reviewed_at"`
	Notes        *string    `json:"notes"`
	CreatedAt    time.Time  `json:"created_at"`
}

type CreateReturnItemRequest struct {
	ProductId                 int               `json:"product_id" binding:"required"`
	OriginalTransactionItemId *int64            `json:"original_transaction_item_id"`
	Quantity                  int               `json:"quantity" binding:"required,min=1"`
	UnitPrice                 float64           `json:"unit_price" binding:"required"`
	ReturnReason              string            `json:"return_reason" binding:"required"`
	Disposition               ReturnDisposition `json:"disposition" binding:"required"`
}

type CreateReturnRequest struct {
	StoreId               *int                      `json:"store_id"`
	OriginalTransactionId *int64                    `json:"original_transaction_id"`
	RefundMethod          RefundMethod              `json:"refund_method" binding:"required"`
	Notes                 *string                   `json:"notes"`
	Items                 []CreateReturnItemRequest `json:"items" binding:"required,min=1"`
}

type ReturnSearchCriteria struct {
	StoreId   *int          `json:"store_id"`
	Status    *ReturnStatus `json:"status"`
	DateFrom  *string       `json:"date_from"`
	DateTo    *string       `json:"date_to"`
	Query     *string       `json:"query"`
}

type OriginalTransactionItemForReturn struct {
	TransactionItemId     int64   `json:"transaction_item_id"`
	ProductId             int     `json:"product_id"`
	ProductSku            string  `json:"product_sku"`
	ProductName           string  `json:"product_name"`
	Brand                 string  `json:"brand"`
	PurchasedQty          int     `json:"purchased_qty"`
	ReturnedQty           int     `json:"returned_qty"`
	ReturnableQty         int     `json:"returnable_qty"`
	UnitPrice             float64 `json:"unit_price"`
	UnitCost              float64 `json:"unit_cost"`
	IsReturnable          bool    `json:"is_returnable"`
	ReturnWindowDays      int     `json:"return_window_days"`
	IsOutsidePolicyWindow bool    `json:"is_outside_policy_window"`
}

type LookupTransactionResponse struct {
	TransactionId   int64                              `json:"transaction_id"`
	StoreId         int                                `json:"store_id"`
	RegisterId      string                             `json:"register_id"`
	CreatedAt       time.Time                          `json:"created_at"`
	PaymentMethod   string                             `json:"payment_method"`
	TotalAmount     float64                            `json:"total_amount"`
	DaysSinceSale   int                                `json:"days_since_sale"`
	Items           []OriginalTransactionItemForReturn `json:"items"`
}

type RecentTransactionSummary struct {
	TransactionId int64     `json:"transaction_id"`
	StoreId       int       `json:"store_id"`
	RegisterId    string    `json:"register_id"`
	TotalAmount   float64   `json:"total_amount"`
	CreatedAt     time.Time `json:"created_at"`
	QuantitySold  int       `json:"quantity_sold"`
	UnitPrice     float64   `json:"unit_price"`
}

