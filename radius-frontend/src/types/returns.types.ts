export type ReturnStatus = "PENDING_APPROVAL" | "APPROVED" | "COMPLETED" | "REJECTED";

export type ReturnDisposition = "RESTOCK" | "OPEN_BOX" | "DEFECTIVE_RTV" | "DAMAGED_WRITE_OFF" | "QUARANTINE";

export type RefundMethod = "CASH" | "CARD" | "GIFT CARD" | "STORE_CREDIT";

export type RtvStatus = "QUEUED" | "APPROVED" | "SHIPPED" | "CREDITED" | "REJECTED";

export type ReturnReason =
    | "DEFECTIVE"
    | "WRONG_ITEM"
    | "CHANGED_MIND"
    | "DAMAGED_IN_BOX"
    | "MISSING_PARTS"
    | "WARRANTY_CLAIM"
    | "OTHER";

export interface CustomerReturnSummary {
    return_id: number;
    store_id: number;
    store_name: string;
    original_transaction_id?: number;
    employee_id: number;
    employee_name: string;
    status: ReturnStatus;
    refund_method: RefundMethod;
    total_refund: number;
    item_count: number;
    is_store_credit: boolean;
    created_at: string;
    approved_by_name?: string;
}

export interface CustomerReturnItemDetail {
    return_item_id: number;
    return_id: number;
    product_id: number;
    product_name: string;
    sku: string;
    upc: string;
    brand: string;
    original_transaction_item_id?: number;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    tax_amount: number;
    return_reason: string;
    disposition: ReturnDisposition;
    created_at: string;
}

export interface CustomerReturnDetailResponse {
    return: CustomerReturnSummary;
    items: CustomerReturnItemDetail[];
}

export interface OriginalTransactionItemForReturn {
    transaction_item_id: number;
    product_id: number;
    product_sku: string;
    product_name: string;
    brand: string;
    purchased_qty: number;
    returned_qty: number;
    returnable_qty: number;
    unit_price: number;
    unit_cost: number;
    is_returnable: boolean;
    return_window_days: number;
    is_outside_policy_window: boolean;
}

export interface LookupTransactionResponse {
    transaction_id: number;
    store_id: number;
    register_id: string;
    created_at: string;
    payment_method: string;
    total_amount: number;
    days_since_sale: number;
    items: OriginalTransactionItemForReturn[];
}

export interface RecentTransactionSummary {
    transaction_id: number;
    store_id: number;
    register_id: string;
    total_amount: number;
    created_at: string;
    quantity_sold: number;
    unit_price: number;
}

export interface CreateReturnItemRequest {
    product_id: number;
    original_transaction_item_id?: number;
    quantity: number;
    unit_price: number;
    return_reason: string;
    disposition: ReturnDisposition;
}

export interface CreateReturnRequest {
    store_id?: number;
    original_transaction_id?: number;
    refund_method: RefundMethod;
    notes?: string;
    items: CreateReturnItemRequest[];
}

export interface RtvQueueItem {
    rtv_id: number;
    return_item_id: number;
    store_id: number;
    product_id: number;
    product_name: string;
    sku: string;
    upc: string;
    quantity: number;
    status: RtvStatus;
    supplier_id?: number;
    supplier_name?: string;
    reviewed_by?: number;
    reviewed_at?: string;
    notes?: string;
    created_at: string;
}

