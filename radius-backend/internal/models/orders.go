package models

import "time"

type POStatus string

const (
	POStatusDraft     POStatus = "DRAFT"
	POStatusSent      POStatus = "SENT"
	POStatusPartial   POStatus = "PARTIAL"
	POStatusReceived  POStatus = "RECEIVED"
	POStatusCancelled POStatus = "CANCELLED"
)

type PurchaseOrder struct {
	POId       int        `json:"po_id"`
	StoreId    int        `json:"store_id"`
	SupplierId int        `json:"supplier_id"`
	Status     POStatus   `json:"status"`
	OrderedAt  time.Time  `json:"ordered_at"`
	ExpectedAt *time.Time `json:"expected_at"`
	CreatedBy  int        `json:"created_by"`
	CreatedAt  time.Time  `json:"created_at"`
}

type PurchaseOrdersItem struct {
	POItemId    int     `json:"po_item_id"`
	POId        int     `json:"po_id"`
	ProductId   int     `json:"product_id"`
	QtyOrdered  int     `json:"qty_ordered"`
	QtyReceived int     `json:"qty_received"`
	UnitCost    float32 `json:"unit_cost"`
}

type OnlineOrderType string
type OnlineOrderStatus string

const (
	OnlineOrderTypePickup   OnlineOrderType = "PICKUP"
	OnlineOrderTypeDelivery OnlineOrderType = "DELIVERY"
	OnlineOrderTypeShipping OnlineOrderType = "SHIPPING"
)

const (
	OnlineOrderStatusPlaced         OnlineOrderStatus = "PLACED"
	OnlineOrderStatusPicking        OnlineOrderStatus = "PICKING"
	OnlineOrderStatusPacked         OnlineOrderStatus = "PACKED"
	OnlineOrderStatusReady          OnlineOrderStatus = "READY"
	OnlineOrderStatusOutForDelivery OnlineOrderStatus = "OUT FOR DELIVERY"
	OnlineOrderStatusCompleted      OnlineOrderStatus = "COMPLETED"
	OnlineOrderStatusCancelled      OnlineOrderStatus = "CANCELLED"
)

type OnlineOrder struct {
	OrderId         int               `json:"order_id"`
	StoreId         int               `json:"store_id"`
	CustomerEmail   string            `json:"customer_email"`
	CustomerName    string            `json:"customer_name"`
	OrderType       OnlineOrderType   `json:"order_type"`
	Status          OnlineOrderStatus `json:"status"`
	PlacedAt        time.Time         `json:"placed_at"`
	FulfilledAt     *time.Time        `json:"fulfilled_at"`
	Subtotal        float32           `json:"subtotal"`
	TaxAmount       float32           `json:"tax_amount"`
	ShippingFee     float32           `json:"shipping_fee"`
	TotalAmount     float32           `json:"total_amount"`
	ShippingAddress string            `json:"shipping_address"`
}

type OnlineOrderItem struct {
	OrderItemId int     `json:"order_item_id"`
	OrderId     int     `json:"order_id"`
	ProductId   int     `json:"product_id"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float32 `json:"unit_price"`
	PickedQty   int     `json:"picked_qty"`
}
