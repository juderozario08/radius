// radius-frontend/src/types/report.types.ts

export type FillReportStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";

export interface FillReport {
    fill_report_id: number;
    store_id: number;
    report_date: string;
    generated_by?: number;
    status: FillReportStatus;
    created_at: string;
}

export interface FillReportItemDetail {
    fill_item_id: number;
    fill_report_id: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    product_upc: string;
    brand: string;
    category_id?: number;
    category_name?: string;
    aisle?: string;
    mims_location_id?: string;
    on_hand_qty: number;
    available_qty: number;
    fill_qty: number;
    completed: boolean;
    completed_at?: string;
    is_empty_hole: boolean;
    created_at: string;
    updated_at?: string;
}

export type FillReportFilterType = "ALL" | "TRANSACTIONS" | "IS4TC" | "NEGATIVE" | "IN_STOCK";
export type FillReportSortBy = "aisle" | "location" | "category" | "name" | "fill_qty" | "on_hand_qty";

export interface FillReportFilter {
    query?: string;
    filter_type?: FillReportFilterType;
    sort_by?: FillReportSortBy;
    sort_order?: "ASC" | "DESC";
    store_id?: number;
}

export interface FillReportResponse {
    fill_report: FillReport;
    items: FillReportItemDetail[];
    total_items: number;
    fill_qty_sum: number;
    is4tc_count: number;
}

export interface ScanEmptyHoleRequest {
    product_id: number;
}
