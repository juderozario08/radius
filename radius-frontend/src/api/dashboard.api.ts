import { ENDPOINTS } from "@/constants/routes";
import { StoreOperationSummary } from "@/types/admin.types";
import { CycleCountSummary } from "@/types/cyclecount.types";
import { GetAllOnlineOrdersResponse } from "@/types/order.types";
import { PurchaseOrderSummary } from "@/types/receiving.types";
import { callApi } from "@/utils/helpers";

type Logout = () => Promise<void>;

export function getDashboardStoreOperations(logout: Logout) {
    return callApi<StoreOperationSummary[]>(ENDPOINTS.ADMIN.STORES.operations, { method: "GET" }, logout);
}

export function getDashboardOrders(storeId: number | undefined, logout: Logout) {
    const storeParam = storeId ? `&store_id=${storeId}` : "";
    const endpoint = `${ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.getAll}?page=1&page_size=40&dashboard_only=true${storeParam}`;
    return callApi<GetAllOnlineOrdersResponse>(endpoint, { method: "GET" }, logout);
}

export function getCancelledDashboardOrders(storeId: number | undefined, logout: Logout) {
    const storeParam = storeId ? `&store_id=${storeId}` : "";
    const endpoint = `${ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.getAll}?page=1&page_size=10&status=CANCELLED${storeParam}`;
    return callApi<GetAllOnlineOrdersResponse>(endpoint, { method: "GET" }, logout);
}

export function getDashboardCycleCounts(storeId: number | undefined, logout: Logout) {
    const storeParam = storeId ? `?store_id=${storeId}` : "";
    return callApi<CycleCountSummary[]>(`${ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.getWeekly}${storeParam}`, { method: "GET" }, logout);
}

export function getDashboardPurchaseOrders(storeId: number | undefined, logout: Logout) {
    const storeParam = storeId ? `?store_id=${storeId}` : "";
    return callApi<PurchaseOrderSummary[]>(`${ENDPOINTS.SALES_FLOOR.RECEIVING.purchaseOrders}${storeParam}`, { method: "GET" }, logout);
}
