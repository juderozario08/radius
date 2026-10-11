import type { Money } from "@/utils/money";

import { OrderType, OrderStatus } from "./order.types";
import { PrintOrderStatus } from "./print_order.types";

export type ConnectionStatus =
    | "connected"
    | "connecting"
    | "reconnecting"
    | "disconnected";

export type WSEventType =
    | "order_created"
    | "order_status_updated"
    | "print_order_status_updated"
    | "cycle_count_updated"
    | "store_activity"
    | "ping"
    | "pong";

export interface WSMessage<T = unknown> {
    type: WSEventType;
    store_id: number;
    timestamp: string;
    payload: T;
}

export type WSEvent<T = unknown> = WSMessage<T>;

export interface OrderCreatedPayload {
    order_id: number;
    store_id: number;
    customer_name: string;
    customer_email: string;
    order_type: OrderType | string;
    status: OrderStatus | string;
    total_amount: Money;
    items_count: number;
    placed_at: string;
    assigned_to?: number | null;
    assigned_to_name?: string | null;
}

export interface OrderStatusUpdatedPayload {
    order_id: number;
    store_id: number;
    customer_name: string;
    order_type: OrderType | string;
    previous_status: OrderStatus | string;
    new_status: OrderStatus | string;
    total_amount: Money;
    updated_at: string;
    assigned_to?: number | null;
    assigned_to_name?: string | null;
}

export interface PrintOrderStatusUpdatedPayload {
    print_order_id: number;
    store_id: number;
    previous_status: PrintOrderStatus;
    new_status: PrintOrderStatus;
}

export type CycleCountAction =
    | "started"
    | "scanned"
    | "submitted"
    | "approved"
    | "transferred"
    | string;

export interface CycleCountUpdatedPayload {
    count_id: number;
    store_id: number;
    category_id: number;
    category_name: string;
    status: string;
    action: CycleCountAction;
    total_items: number;
    counted_items: number;
    total_variance_cost: Money;
    updated_at: string;
    counted_by?: number | null;
    counted_by_name?: string | null;
}

export interface StoreActivityPayload {
    activity_id: string;
    store_id: number;
    activity_type: string;
    title: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

export type OrderCreatedEvent = WSMessage<OrderCreatedPayload>;
export type OrderStatusUpdatedEvent = WSMessage<OrderStatusUpdatedPayload>;
export type PrintOrderStatusUpdatedEvent = WSMessage<PrintOrderStatusUpdatedPayload>;
export type CycleCountUpdatedEvent = WSMessage<CycleCountUpdatedPayload>;
export type StoreActivityEvent = WSMessage<StoreActivityPayload>;
export type PingEvent = WSMessage<Record<string, unknown> | undefined>;
export type PongEvent = WSMessage<Record<string, unknown> | undefined>;

export type TypedWSEvent =
    | ({ type: "order_created" } & OrderCreatedEvent)
    | ({ type: "order_status_updated" } & OrderStatusUpdatedEvent)
    | ({ type: "print_order_status_updated" } & PrintOrderStatusUpdatedEvent)
    | ({ type: "cycle_count_updated" } & CycleCountUpdatedEvent)
    | ({ type: "store_activity" } & StoreActivityEvent)
    | ({ type: "ping" } & PingEvent)
    | ({ type: "pong" } & PongEvent);

export type TypedWSMessage = TypedWSEvent;
