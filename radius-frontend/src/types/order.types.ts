export type OrderType = "BOPIS" | "STS" | "DELIVERY" | "PICKUP" | "SHIPPING";
export type OrderStatus =
    | "PENDING"
    | "PROCESSING"
    | "SHIPPED"
    | "READY_FOR_PICKUP"
    | "READY FOR PICKUP"
    | "AWAITING PICKUP"
    | "WAITING FOR CUSTOMER PICKUP"
    | "COMPLETED"
    | "CANCELLED"
    | "PLACED"
    | "PICKING"
    | "PACKED"
    | "READY"
    | "WORK IN PROGRESS"
    | "RELEASED"
    | "DELIVERING"
    | "DELIVERED"
    | "OUT FOR DELIVERY";

export interface OnlineOrder {
    order_id: number;
    store_id: number;
    customer_id?: number | null;
    customer_name: string;
    customer_email: string;
    customer_phone?: string | null;
    order_type: OrderType;
    status: OrderStatus;
    total_amount: number;
    placed_at: string;
    fulfilled_at: string | null;
    
    // Additional fields expected by the UI
    shipping_address: string;
    carrier: string;
    tracking_number: string;
    estimated_delivery_date: string;
    actual_delivery_date: string;
    subtotal: number;
    tax_amount: number;
    shipping_fee: number;
    discount_total: number;
    promo_code: string;
    cost_total: number;
    assigned_to?: number | null;
    assigned_to_name?: string | null;
    cancellation_reason?: string | null;
}

export type OrderItemStatus = "ACTIVE" | "CANCELLED" | "REMOVED";

export interface OnlineOrderItem {
    item_id?: number;
    order_item_id: number;
    order_id: number;
    product_id: number;
    product_sku?: string | null;
    quantity: number;
    unit_price: number;
    picked_qty: number;
    discount_amount?: number;
    status?: OrderItemStatus;
    reason?: string | null;
}

export interface GetAllOnlineOrdersResponse {
    online_orders: OnlineOrder[];
    total_length: number;
}

export interface GetOnlineOrderByIDResponse {
    online_order: OnlineOrder;
    items: OnlineOrderItem[];
}
