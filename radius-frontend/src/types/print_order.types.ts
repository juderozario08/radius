export type PrintOrderType = "WEB" | "WALK_IN";
export type PrintOrderStatus =
    | "PENDING"
    | "IN PROGRESS"
    | "WORK IN PROGRESS"
    | "READY FOR PICKUP"
    | "SHIPPED"
    | "COMPLETED"
    | "CANCELLED";

export interface PrintService {
    service_id: number;
    name: string;
    description: string;
    category: string;
    base_price: number;
    is_active: boolean;
    created_at: string;
}

export interface PrintSupply {
    supply_id: number;
    store_id: number;
    name: string;
    description: string;
    unit: string;
    current_qty: number;
    reorder_threshold: number;
    reorder_qty: number;
    unit_cost: number;
    supplier_name: string;
    is_active: boolean;
    is_low_stock: boolean;
    updated_at: string;
}

export interface PrintOrder {
    print_order_id: number;
    store_id: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    order_type: PrintOrderType;
    status: PrintOrderStatus;
    subtotal: number;
    tax_amount: number;
    shipping_fee: number;
    total_amount: number;
    shipping_address: string;
    notes: string;
    placed_at: string;
    fulfilled_at: string | null;
}

export interface PrintOrderItem {
    print_order_item_id: number;
    print_order_id: number;
    service_id: number | null;
    description: string;
    quantity: number;
    unit_price: number;
}

export interface GetAllPrintOrdersResponse {
    print_orders: PrintOrder[];
    total_length: number;
}

export interface GetPrintOrderResponse {
    print_order: PrintOrder;
    items: PrintOrderItem[];
}
