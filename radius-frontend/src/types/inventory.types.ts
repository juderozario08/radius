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
    created_at: string;
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
