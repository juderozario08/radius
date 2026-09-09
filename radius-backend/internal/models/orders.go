// radius-backend/internal/models/orders.go
package models

import (
	"fmt"
	"time"
)

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
	OnlineOrderTypeBOPIS    OnlineOrderType = "BOPIS"
	OnlineOrderTypeSTS      OnlineOrderType = "STS"
	OnlineOrderTypeShipping OnlineOrderType = "SHIPPING"
)

const (
	OnlineOrderStatusReadyForPickup OnlineOrderStatus = "READY FOR PICKUP"
	OnlineOrderStatusAwaitingPickup OnlineOrderStatus = "AWAITING PICKUP"
	OnlineOrderStatusReleased       OnlineOrderStatus = "RELEASED"
	OnlineOrderStatusWorkInProgress OnlineOrderStatus = "WORK IN PROGRESS"
	OnlineOrderStatusShipped        OnlineOrderStatus = "SHIPPED"
	OnlineOrderStatusDelivering     OnlineOrderStatus = "DELIVERING"
	OnlineOrderStatusDelivered      OnlineOrderStatus = "DELIVERED"
	OnlineOrderStatusCancelled      OnlineOrderStatus = "CANCELLED"
)

func (o *OnlineOrder) ValidateStatus() error {
	if o.Status == OnlineOrderStatusCancelled {
		return nil
	}
	switch o.OrderType {
	case OnlineOrderTypeBOPIS:
		if o.Status != OnlineOrderStatusWorkInProgress &&
			o.Status != OnlineOrderStatusReadyForPickup &&
			o.Status != OnlineOrderStatusAwaitingPickup &&
			o.Status != OnlineOrderStatusReleased {
			return fmt.Errorf("invalid status %s for BOPIS order", o.Status)
		}
	case OnlineOrderTypeSTS, OnlineOrderTypeShipping:
		if o.Status != OnlineOrderStatusWorkInProgress &&
			o.Status != OnlineOrderStatusShipped &&
			o.Status != OnlineOrderStatusDelivering &&
			o.Status != OnlineOrderStatusDelivered &&
			o.Status != OnlineOrderStatusReleased &&
			o.Status != OnlineOrderStatusAwaitingPickup {
			return fmt.Errorf("invalid status %s for STS order", o.Status)
		}
	}
	return nil
}

type OnlineOrder struct {
	OrderId            int               `json:"order_id"`
	StoreId            int               `json:"store_id"`
	CustomerEmail      string            `json:"customer_email"`
	CustomerName       string            `json:"customer_name"`
	OrderType          OnlineOrderType   `json:"order_type"`
	Status             OnlineOrderStatus `json:"status"`
	PlacedAt           time.Time         `json:"placed_at"`
	FulfilledAt        *time.Time        `json:"fulfilled_at"`
	Subtotal           float32           `json:"subtotal"`
	TaxAmount          float32           `json:"tax_amount"`
	ShippingFee        float32           `json:"shipping_fee"`
	TotalAmount        float32           `json:"total_amount"`
	ShippingAddress    string            `json:"shipping_address"`
	AssignedTo         *int              `json:"assigned_to,omitempty"`
	AssignedToName     *string           `json:"assigned_to_name,omitempty"`
	CancellationReason *string           `json:"cancellation_reason,omitempty"`
	Items              []OnlineOrderItem `json:"items,omitempty"`
}

type OnlineOrderItem struct {
	OrderItemId int     `json:"order_item_id"`
	OrderId     int     `json:"order_id"`
	ProductId   int     `json:"product_id"`
	ProductSku  *string `json:"product_sku"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float32 `json:"unit_price"`
	PickedQty   *int    `json:"picked_qty"`
	Status      string  `json:"status"` // ACTIVE, CANCELLED, REMOVED
	Reason      *string `json:"reason,omitempty"`
}

type UpdateOnlineOrderItemRequest struct {
	OrderID     int     `json:"order_id" binding:"required"`
	OrderItemID int     `json:"order_item_id" binding:"required"`
	PickedQty   *int    `json:"picked_qty"`
	Status      string  `json:"status"` // ACTIVE, CANCELLED, REMOVED
	Reason      *string `json:"reason"`
}

type CancelOnlineOrderRequest struct {
	OrderID int    `json:"order_id" binding:"required"`
	Reason  string `json:"reason" binding:"required"`
}

type CompletePickRequest struct {
	OrderID int `json:"order_id" binding:"required"`
}

type GetAllOnlineOrdersResponse struct {
	OnlineOrders any `json:"online_orders"`
	TotalLength  int `json:"total_length"`
}

type GetOnlineOrderResponse struct {
	OnlineOrder any `json:"online_order"`
	Items       any `json:"items"`
}

type AssignOnlineOrderRequest struct {
	OrderID    int  `json:"order_id" binding:"required"`
	EmployeeID *int `json:"employee_id"`
}

type OrderSearchCriteria struct {
	OrderType         string
	OrderID           *int
	CustomerFirstName string
	CustomerLastName  string
	CustomerEmail     string
	BillingPhone      string
	PaymentCard       string
	SKU               string
	Status            string
	AssignedTo        *int
	DashboardOnly     bool
	StoreID           *int
}

// Print Order Types & Statuses
type PrintOrderType string
type PrintOrderStatus string

const (
	PrintOrderTypeWeb    PrintOrderType = "WEB"
	PrintOrderTypeWalkIn PrintOrderType = "WALK_IN"
)

const (
	PrintOrderStatusPending        PrintOrderStatus = "PENDING"
	PrintOrderStatusInProgress     PrintOrderStatus = "IN PROGRESS"
	PrintOrderStatusReadyForPickup PrintOrderStatus = "READY FOR PICKUP"
	PrintOrderStatusShipped        PrintOrderStatus = "SHIPPED"
	PrintOrderStatusCompleted      PrintOrderStatus = "COMPLETED"
	PrintOrderStatusCancelled      PrintOrderStatus = "CANCELLED"
)

type PrintService struct {
	ServiceId   int       `json:"service_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	BasePrice   float32   `json:"base_price"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

type PrintSupply struct {
	SupplyId         int       `json:"supply_id"`
	StoreId          int       `json:"store_id"`
	Name             string    `json:"name"`
	Description      string    `json:"description"`
	Unit             string    `json:"unit"`
	CurrentQty       int       `json:"current_qty"`
	ReorderThreshold int       `json:"reorder_threshold"`
	ReorderQty       int       `json:"reorder_qty"`
	UnitCost         float32   `json:"unit_cost"`
	SupplierName     string    `json:"supplier_name"`
	IsActive         bool      `json:"is_active"`
	IsLowStock       bool      `json:"is_low_stock"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type PrintOrder struct {
	PrintOrderId    int              `json:"print_order_id"`
	StoreId         int              `json:"store_id"`
	CustomerName    string           `json:"customer_name"`
	CustomerEmail   string           `json:"customer_email"`
	CustomerPhone   string           `json:"customer_phone"`
	OrderType       PrintOrderType   `json:"order_type"`
	Status          PrintOrderStatus `json:"status"`
	Subtotal        float32          `json:"subtotal"`
	TaxAmount       float32          `json:"tax_amount"`
	ShippingFee     float32          `json:"shipping_fee"`
	TotalAmount     float32          `json:"total_amount"`
	ShippingAddress string           `json:"shipping_address"`
	Notes           string           `json:"notes"`
	PlacedAt        time.Time        `json:"placed_at"`
	FulfilledAt     *time.Time       `json:"fulfilled_at"`
}

type PrintOrderItem struct {
	PrintOrderItemId int     `json:"print_order_item_id"`
	PrintOrderId     int     `json:"print_order_id"`
	ServiceId        *int    `json:"service_id"`
	Description      string  `json:"description"`
	Quantity         int     `json:"quantity"`
	UnitPrice        float32 `json:"unit_price"`
}

type GetAllPrintOrdersResponse struct {
	PrintOrders any `json:"print_orders"`
	TotalLength int `json:"total_length"`
}

type GetPrintOrderResponse struct {
	PrintOrder any `json:"print_order"`
	Items      any `json:"items"`
}

type PrintOrderSearchCriteria struct {
	OrderType     string
	OrderID       *int
	CustomerName  string
	CustomerEmail string
	CustomerPhone string
	Status        string
}
