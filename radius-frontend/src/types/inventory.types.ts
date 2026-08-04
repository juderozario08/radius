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
