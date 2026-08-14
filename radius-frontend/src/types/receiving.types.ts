//radius-frontend/src/types/receiving.types.ts

export type PurchaseOrderStatus = 'DRAFT' | 'SHIPPED' | 'DELIVERING' | 'DELIVERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
export type TransferStatus = "PENDING" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrderSummary {
    po_id: number;
    store_id: number;
    store_name: string;
    supplier_name: string;
    status: PurchaseOrderStatus;
    item_count: number;
    ordered_at: string;
    expected_at: string | null;
    arrived_at: string | null;
    has_lprs: boolean;
}

export interface PurchaseOrderItemDetail {
    po_item_id: number;
    product_id: number;
    sku: string;
    upc: string;
    name: string;
    brand: string;
    qty_ordered: number;
    qty_received: number;
    unit_cost: number;
}

export interface PurchaseOrderLPR {
    lpr_id: number;
    lpr_barcode: string;
    is_received: boolean;
    received_at: string | null;
}

export interface PurchaseOrderDetailResponse {
    po_id: number;
    store_id: number;
    supplier_name: string;
    status: PurchaseOrderStatus;
    ordered_at: string;
    expected_at: string | null;
    arrived_at: string | null;
    has_lprs: boolean;
    items: PurchaseOrderItemDetail[];
    lprs: PurchaseOrderLPR[];
}

export interface StockTransferSummary {
    transfer_id: number;
    from_store_id: number;
    from_store_name: string;
    to_store_id: number;
    to_store_name: string;
    status: TransferStatus;
    manual_check_required: boolean;
    item_count: number;
    created_at: string;
}

export interface StockTransferItemDetail {
    transfer_item_id: number;
    product_id: number;
    sku: string;
    upc: string;
    name: string;
    brand: string;
    qty_requested: number;
    qty_sent: number | null;
    qty_received: number | null;
}

export interface StockTransferDetailResponse {
    transfer_id: number;
    from_store_name: string;
    to_store_name: string;
    status: TransferStatus;
    manual_check_required: boolean;
    created_at: string;
    items: StockTransferItemDetail[];
}

export interface CheckProductInPOResponse {
    found: boolean;
    item: PurchaseOrderItemDetail | null;
}

export interface CheckProductInTransferResponse {
    found: boolean;
    item: StockTransferItemDetail | null;
}

// Request types
export interface ReceivePOItemEntry {
    po_item_id: number;
    qty_received: number;
}

export interface ReceiveTransferItemEntry {
    transfer_item_id: number;
    qty_received: number;
}
