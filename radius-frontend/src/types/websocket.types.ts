// radius-frontend/src/types/websocket.types.ts
import { OrderType, OrderStatus } from "./order.types";

/**
 * Real-time connection status values.
 */
export type ConnectionStatus =
    | "connected"
    | "connecting"
    | "reconnecting"
    | "disconnected";

/**
 * Discrete event discriminators supported across the WebSocket wire protocol.
 * Synchronized with Go backend models: radius-backend/internal/models/websocket.go.
 */
export type WSEventType =
    | "order_created"
    | "order_status_updated"
    | "cycle_count_updated"
    | "store_activity"
    | "ping"
    | "pong";

/**
 * Standard WebSocket wire envelope matching backend models.WebSocketEvent.
 */
export interface WSMessage<T = unknown> {
    type: WSEventType;
    store_id: number;
    timestamp: string;
    payload: T;
}

/**
 * Alias for WSMessage for API ergonomic parity.
 */
export type WSEvent<T = unknown> = WSMessage<T>;

/**
 * Payload broadcast when a customer places a new online order (BOPIS/STS/SHIPPING).
 * Matches Go backend OrderCreatedPayload.
 */
export interface OrderCreatedPayload {
    order_id: number;
    store_id: number;
    customer_name: string;
    customer_email: string;
    order_type: OrderType | string;
    status: OrderStatus | string;
    total_amount: number;
    items_count: number;
    placed_at: string;
    assigned_to?: number | null;
    assigned_to_name?: string | null;
}

/**
 * Payload broadcast when an existing order changes status (e.g. PENDING -> READY_FOR_PICKUP).
 * Matches Go backend OrderStatusUpdatedPayload.
 */
export interface OrderStatusUpdatedPayload {
    order_id: number;
    store_id: number;
    customer_name: string;
    order_type: OrderType | string;
    previous_status: OrderStatus | string;
    new_status: OrderStatus | string;
    total_amount: number;
    updated_at: string;
    assigned_to?: number | null;
    assigned_to_name?: string | null;
}

/**
 * Action stages for cycle counts.
 */
export type CycleCountAction =
    | "started"
    | "scanned"
    | "submitted"
    | "approved"
    | "transferred"
    | string;

/**
 * Payload broadcast when a store cycle count starts, scans an item, or changes status.
 * Matches Go backend CycleCountUpdatedPayload.
 */
export interface CycleCountUpdatedPayload {
    count_id: number;
    store_id: number;
    category_id: number;
    category_name: string;
    status: string;
    action: CycleCountAction;
    total_items: number;
    counted_items: number;
    total_variance_cost: number;
    updated_at: string;
    counted_by?: number | null;
    counted_by_name?: string | null;
}

/**
 * Payload broadcast for operational store activities (POS sales, adjustments, receiving dock).
 * Matches Go backend StoreActivityPayload.
 */
export interface StoreActivityPayload {
    activity_id: string;
    store_id: number;
    activity_type: string;
    title: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

// Concrete typed events
export type OrderCreatedEvent = WSMessage<OrderCreatedPayload>;
export type OrderStatusUpdatedEvent = WSMessage<OrderStatusUpdatedPayload>;
export type CycleCountUpdatedEvent = WSMessage<CycleCountUpdatedPayload>;
export type StoreActivityEvent = WSMessage<StoreActivityPayload>;
export type PingEvent = WSMessage<Record<string, unknown> | undefined>;
export type PongEvent = WSMessage<Record<string, unknown> | undefined>;

/**
 * Discriminated union of all incoming typed WebSocket messages.
 */
export type TypedWSEvent =
    | ({ type: "order_created" } & OrderCreatedEvent)
    | ({ type: "order_status_updated" } & OrderStatusUpdatedEvent)
    | ({ type: "cycle_count_updated" } & CycleCountUpdatedEvent)
    | ({ type: "store_activity" } & StoreActivityEvent)
    | ({ type: "ping" } & PingEvent)
    | ({ type: "pong" } & PongEvent);

export type TypedWSMessage = TypedWSEvent;
