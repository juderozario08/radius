import { ENDPOINTS } from "@/constants/routes";
import { Category, SearchFilters, SearchProductsResponse } from "@/types/inventory.types";
import { callApi } from "@/utils/helpers";

type Logout = () => Promise<void>;

export function getProductCategories(logout: Logout) {
    return callApi<Category[]>(ENDPOINTS.SALES_FLOOR.PRODUCTS.categories, { method: "GET", swr: true }, logout);
}

export function getProductBrands(logout: Logout) {
    return callApi<string[]>(ENDPOINTS.SALES_FLOOR.PRODUCTS.brands, { method: "GET", swr: true }, logout);
}

export function searchCatalogProducts(query: string, filters: SearchFilters, limit: number, offset: number, signal: AbortSignal | undefined, logout: Logout) {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (filters.category_id) params.append("category_id", String(filters.category_id));
    if (filters.brand) params.append("brand", filters.brand);
    if (filters.is_active !== undefined) params.append("is_active", String(filters.is_active));
    if (filters.unit_of_measure) params.append("unit_of_measure", filters.unit_of_measure);
    params.append("limit", String(limit));
    params.append("offset", String(offset));
    const endpoint = `${ENDPOINTS.SALES_FLOOR.PRODUCTS.search}?${params.toString()}`;
    return callApi<SearchProductsResponse>(endpoint, { method: "GET", signal }, logout);
}
