package models

import "time"

type PriceHistory struct {
	PriceId       int        `json:"price_id"`
	ProductId     int        `json:"product_id"`
	StoreId       int        `json:"store_id"`
	RegularPrice  Money      `json:"regular_price"`
	SalePrice     *Money     `json:"sale_price"`
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
	TransactionId     int                       `json:"transaction_id"`
	StoreId           int                       `json:"store_id"`
	RegisterId        string                    `json:"register_id"`
	EmployeeId        *int                      `json:"employee_id"`
	TransactionType   TransactionType           `json:"transaction_type"`
	Subtotal          Money                     `json:"subtotal"`
	TaxAmount         Money                     `json:"tax_amount"`
	DiscountTotal     Money                     `json:"discount_total"`
	CostTotal         Money                     `json:"cost_total"`
	TotalAmount       Money                     `json:"total_amount"`
	PaymentMethod     *TransactionPaymentMethod `json:"payment_method"`
	CardType          *string                   `json:"card_type"`
	CardNumber        *string                   `json:"card_number"`
	Status            TransactionStatus         `json:"status"`
	PreferredMemberId *int                      `json:"preferred_member_id"`
	PaymentReference  *string                   `json:"payment_reference"`
	CreatedAt         time.Time                 `json:"created_at"`
}

type TransactionItem struct {
	TransactionItemId int     `json:"transaction_item_id"`
	TransactionId     int     `json:"transaction_id"`
	ProductId         int     `json:"product_id"`
	ProductSku        *string `json:"product_sku"`
	ProductName       *string `json:"product_name"`
	Quantity          int     `json:"quantity"`
	UnitPrice         Money   `json:"unit_price"`
	UnitCost          Money   `json:"unit_cost"`
	DiscountAmount    Money   `json:"discount_amount"`
	ReturnReason      *string `json:"return_reason"`
	ScannedBarcode    *string `json:"scanned_barcode"`
}

type GetAllTransactionsResponse struct {
	Transactions any `json:"transactions"`
	TotalLength  int `json:"total_length"`
}

type GetTransactionResponse struct {
	Transaction any `json:"transaction"`
	Items       any `json:"items"`
}

type CreateTransactionItemRequest struct {
	ProductId      int     `json:"product_id" binding:"required"`
	Quantity       int     `json:"quantity" binding:"required,min=1"`
	UnitPrice      Money   `json:"-"`
	UnitCost       Money   `json:"-"`
	DiscountAmount Money   `json:"-"`
	ScannedBarcode *string `json:"scanned_barcode"`
}

type CreateTransactionRequest struct {
	StoreId           *int                           `json:"store_id"`
	RegisterId        string                         `json:"register_id" binding:"required"`
	TransactionType   TransactionType                `json:"transaction_type"`
	Subtotal          Money                          `json:"-"`
	TaxAmount         Money                          `json:"-"`
	DiscountTotal     Money                          `json:"-"`
	CostTotal         Money                          `json:"-"`
	TotalAmount       Money                          `json:"-"`
	PaymentMethod     *TransactionPaymentMethod      `json:"payment_method"`
	CardType          *string                        `json:"card_type"`
	CardNumber        *string                        `json:"card_number"`
	PreferredMemberId *int                           `json:"preferred_member_id"`
	PaymentReference  *string                        `json:"payment_reference"`
	Items             []CreateTransactionItemRequest `json:"items" binding:"required,min=1"`
}
