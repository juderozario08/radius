//radius-backend/internal/models/sales.go
package models

import "time"

type PriceHistory struct {
	PriceId       int        `json:"price_id"`
	ProductId     int        `json:"product_id"`
	StoreId       int        `json:"store_id"`
	RegularPrice  float32    `json:"regular_price"`
	SalePrice     *float32   `json:"sale_price"`
	SaleStart     *time.Time `json:"sale_start"`
	SaleEnd       *time.Time `json:"sale_end"`
	EffectiveFrom *time.Time `json:"effective_from"`
	EffectiveTill *time.Time `json:"effective_till"`
	CreatedBy     int        `json:"created_by"`
}

type TransactionType string
type TransactionPaymentMethod string
type TransactionStatus string

const (
	TransactionTypeSale   TransactionType = "SALE"
	TransactionTypeReturn TransactionType = "RETURN"
	TransactionTypeVoid   TransactionType = "VOID"
)
const (
	TransactionPaymentMethodCash     TransactionPaymentMethod = "CASH"
	TransactionPaymentMethodCard     TransactionPaymentMethod = "CARD"
	TransactionPaymentMethodGiftCard TransactionPaymentMethod = "GIFT CARD"
)
const (
	TransactionStatusVoided    TransactionStatus = "VOIDED"
	TransactionStatusCompleted TransactionStatus = "COMPLETED"
	TransactionStatusRefunded  TransactionStatus = "REFUNDED"
)

type Transaction struct {
	TransactionId   int                      `json:"transaction_id"`
	StoreId         int                       `json:"store_id"`
	RegisterId      string                    `json:"register_id"`
	EmployeeId      *int                      `json:"employee_id"`
	TransactionType TransactionType           `json:"transaction_type"`
	Subtotal        float32                   `json:"subtotal"`
	TaxAmount       float32                   `json:"tax_amount"`
	TotalAmount     float32                   `json:"total_amount"`
	PaymentMethod   *TransactionPaymentMethod `json:"payment_method"`
	Status          TransactionStatus         `json:"status"`
	CreatedAt       time.Time                 `json:"created_at"`
}

type TransactionItem struct {
	TransactionItemId int    `json:"transaction_item_id"`
	TransactionId     int    `json:"transaction_id"`
	ProductId         int     `json:"product_id"`
	Quantity          int     `json:"quantity"`
	UnitPrice         float32 `json:"unit_price"`
	DiscountAmount    float32 `json:"discount_amount"`
	ScannedBarcode    *string `json:"scanned_barcode"`
}
