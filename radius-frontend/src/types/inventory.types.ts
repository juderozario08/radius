//radius-frontend/src/types/inventory.types.ts
export type MeasureUnits = "EACH" | "CASE" | "PACK";

export interface Product {
    product_id: number;
    sku: string;
    upc: string;
    name: string;
    description: string | null;
    category_id: number;
    brand: string;
    unit_of_measure: MeasureUnits;
    units_per_case: number;
    weight: number;
    is_active: boolean;
    retail_price: number;
    constrained_end_after: string | null;
    created_at: string;
}

export interface Inventory {
    inventory_id: number;
    store_id: number;
    product_id: number;
    on_hand_qty: number;
    reserved_qty: number;
    available_qty: number;
    reorder_qty: number;
    aisle: string | null;
    mims_location: string | null;
    last_counted_at: string | null;
    open_box_qty: number;
    new_qty: number;
    rtv_qty: number;
    code88_qty: number;
    bopis_qty: number;
    quarantine_qty: number;
    repair_qty: number;
    customer_on_hold_qty: number;
    fc_on_hold_qty: number;
    verify_qty: number;
    demo_qty: number;
    on_order_qty: number;
    last_received_at: string | null;
}

export interface MimsLocationItem {
    mims_location_id: string | null;
    store_id: number;
    inventory_id: number;
    quantity: number;
    location_type: string;
}

export interface Planogram {
    planogram_id: number;
    store_id: number;
    name: string;
    description: string | null;
    aisle: string | null;
    valid_from: string;
    is_active: boolean;
    created_by: number;
    created_at: string;
    updated_at: string | null;
}

export interface ProductScreenDetails {
    product: Product;
    inventory: Inventory;
    locations: MimsLocationItem[];
    planogram_info: Planogram | null;
}

export interface MimsProductInventory extends Product {
    on_hand_qty: number;
    reserved_qty: number;
    available_qty: number;
    reorder_qty: number;
    aisle: string | null;
    mims_location: string | null;
    last_counted_at: string | null;
}

export interface ScanProductResponse {
    product: MimsProductInventory | null;
    message: string;
}

export interface LocationProductsResponse {
    location_id: string;
    products: MimsProductInventory[];
    message: string;
}

export interface SearchProductsResponse {
    products: Product[];
    total: number;
}

export interface Category {
    category_id: number;
    parent_id: number | null;
    name: string;
}

export interface SearchFilters {
    category_id?: number;
    brand?: string;
    is_active?: boolean;
    unit_of_measure?: string;
}
