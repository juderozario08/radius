// radius-backend/internal/models/websocket.go
package models

import "time"

// WSEventType defines the discrete event discriminator sent over the wire.
type WSEventType string

// WebSocketEventType is an alias for WSEventType.
type WebSocketEventType = WSEventType

const (
	EventOrderCreated       WSEventType = "order_created"
	EventOrderStatusUpdated WSEventType = "order_status_updated"
	EventCycleCountUpdated  WSEventType = "cycle_count_updated"
	EventStoreActivity      WSEventType = "store_activity"
	EventPing               WSEventType = "ping"
	EventPong               WSEventType = "pong"

	// WSEvent* aliases for naming flexibility
	WSEventOrderCreated       = EventOrderCreated
	WSEventOrderStatusUpdated = EventOrderStatusUpdated
	WSEventCycleCountUpdated  = EventCycleCountUpdated
	WSEventStoreActivity      = EventStoreActivity
	WSEventPing               = EventPing
	WSEventPong               = EventPong
)

// WebSocketEvent is the standard wire envelope for all WebSocket messages.
type WebSocketEvent struct {
	Type      WSEventType `json:"type"`
	StoreId   int         `json:"store_id"`
	Timestamp time.Time   `json:"timestamp"`
	Payload   any         `json:"payload"`
}

// WSMessage is an alias for WebSocketEvent.
type WSMessage = WebSocketEvent

// OrderCreatedPayload represents the payload for EventOrderCreated.
type OrderCreatedPayload struct {
	OrderId        int               `json:"order_id"`
	StoreId        int               `json:"store_id"`
	CustomerName   string            `json:"customer_name"`
	CustomerEmail  string            `json:"customer_email"`
	OrderType      OnlineOrderType   `json:"order_type"`
	Status         OnlineOrderStatus `json:"status"`
	TotalAmount    float64           `json:"total_amount"`
	ItemsCount     int               `json:"items_count"`
	PlacedAt       time.Time         `json:"placed_at"`
	AssignedTo     *int              `json:"assigned_to,omitempty"`
	AssignedToName *string           `json:"assigned_to_name,omitempty"`
}

// OrderStatusUpdatedPayload represents the payload for EventOrderStatusUpdated.
type OrderStatusUpdatedPayload struct {
	OrderId        int               `json:"order_id"`
	StoreId        int               `json:"store_id"`
	CustomerName   string            `json:"customer_name"`
	OrderType      OnlineOrderType   `json:"order_type"`
	PreviousStatus OnlineOrderStatus `json:"previous_status"`
	NewStatus      OnlineOrderStatus `json:"new_status"`
	TotalAmount    float64           `json:"total_amount"`
	UpdatedAt      time.Time         `json:"updated_at"`
	AssignedTo     *int              `json:"assigned_to,omitempty"`
	AssignedToName *string           `json:"assigned_to_name,omitempty"`
}

// CycleCountUpdatedPayload represents the payload for EventCycleCountUpdated.
type CycleCountUpdatedPayload struct {
	CountId           int       `json:"count_id"`
	StoreId           int       `json:"store_id"`
	CategoryId        int       `json:"category_id"`
	CategoryName      string    `json:"category_name"`
	Status            string    `json:"status"`
	Action            string    `json:"action"` // "started" | "scanned" | "submitted" | "approved" | "transferred"
	TotalItems        int       `json:"total_items"`
	CountedItems      int       `json:"counted_items"`
	TotalVarianceCost float64   `json:"total_variance_cost"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// StoreActivityPayload represents the payload for EventStoreActivity.
type StoreActivityPayload struct {
	ActivityId   string         `json:"activity_id"`
	StoreId      int            `json:"store_id"`
	ActivityType string         `json:"activity_type"`
	Title        string         `json:"title"`
	Description  string         `json:"description"`
	Timestamp    time.Time      `json:"timestamp"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}
