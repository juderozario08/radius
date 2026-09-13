export type CycleCountStatus =
    | "NOT STARTED"
    | "IN PROGRESS"
    | "PENDING APPROVAL"
    | "APPROVED"
    | "COMPLETED";

export interface CycleCount {
    count_id: number;
    store_id: number;
    count_date: string | null;
    category_id: number;
    category_name: string;
    status: CycleCountStatus;
    counted_by: number | null;
    counted_by_name: string | null;
    approved_by: number | null;
    approved_by_name: string | null;
    total_variance_cost: number;
    total_items: number;
    counted_items: number;
    started_at: string | null;
    completed_at: string | null;
    approved_at: string | null;
    notes: string | null;
}

export interface CycleCountSummary {
    count_id: number;
    store_id: number;
    category_name: string;
    category_id: number;
    status: CycleCountStatus;
    counted_by_name: string | null;
    total_items: number;
    counted_items: number;
    count_date: string | null;
    total_variance_cost: number;
}

export interface CycleCountItemDetail {
    count_item_id: number;
    count_id: number;
    product_id: number;
    product_name: string;
    sku: string;
    upc: string;
    brand: string;
    cost_price: number;
    expected_qty: number;
    counted_qty: number;
    variance: number;
    variance_cost: number;
    reason_code: string | null;
    scanned_at: string | null;
    scanned_by: number | null;
}

export interface CycleCountDetailResponse {
    count: CycleCount;
    items: CycleCountItemDetail[];
}

export interface CycleCountScheduleEntry {
    schedule_id: number;
    store_id: number;
    category_id: number;
    category_name: string;
    scheduled_date: string;
    created_by: number | null;
    created_by_name: string | null;
    cycle_count_id: number | null;
    count_status: CycleCountStatus | null;
}

export interface CycleCountSearchCriteria {
    query?: string;
    status?: string;
    category_id?: number;
    date_from?: string;
    date_to?: string;
}

export interface StartCycleCountRequest {
    category_id: number;
}

export interface RecordScanRequest {
    count_id: number;
    product_id?: number;
    barcode?: string;
    counted_qty?: number;
    reason_code?: string;
}

export interface SubmitCycleCountRequest {
    count_id: number;
    notes?: string;
}

export interface ApproveCycleCountRequest {
    count_id: number;
}

export interface TransferCycleCountOwnershipRequest {
    count_id: number;
    employee_id: number;
}

export interface CreateScheduleRequest {
    category_id: number;
    scheduled_date: string;
}
