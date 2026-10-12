import { ENDPOINTS } from "@/constants/routes";
import { GetAllEmployeeResponse } from "@/types/admin.types";
import { GetOnlineOrderByIDResponse, OnlineOrder, OrderItemStatus } from "@/types/order.types";
import { callApi } from "@/utils/helpers";

type Logout = () => Promise<void>;

export function getOnlineOrder(id: string, logout: Logout) {
    return callApi<GetOnlineOrderByIDResponse>(ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.get(id), { method: "GET" }, logout);
}

export function getAssignableEmployees(role: string | undefined, storeId: number | undefined, logout: Logout) {
    const storeParam = storeId ? `&store_id=${storeId}` : "";
    const endpoint = role === "ADMIN"
        ? `${ENDPOINTS.ADMIN.EMPLOYEES.getAll}?page_size=100&page_number=1${storeParam}`
        : `${ENDPOINTS.MANAGER.EMPLOYEES.getAll}?page_size=100&page_number=1${storeParam}`;
    return callApi<GetAllEmployeeResponse>(endpoint, { method: "GET" }, logout);
}

export function assignOnlineOrder(orderId: number, employeeId: number, logout: Logout) {
    return callApi<{ message?: string; online_order?: OnlineOrder; assigned_to?: number; assigned_to_name?: string }>(
        ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.assign(orderId),
        { method: "PUT", body: JSON.stringify({ employee_id: employeeId }) },
        logout
    );
}

export function updateOnlineOrderItem(orderId: number, itemId: number, pickedQty: number, status: OrderItemStatus, logout: Logout, reason?: string | null) {
    return callApi(
        ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.updateItem(orderId, itemId),
        { method: "PUT", body: JSON.stringify({ picked_qty: pickedQty, status, ...(reason !== undefined ? { reason } : {}) }) },
        logout
    );
}

export function completeOnlineOrderPick(orderId: number, logout: Logout) {
    return callApi<{ online_order: OnlineOrder }>(ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.completePick(orderId), { method: "POST" }, logout);
}

export function cancelOnlineOrder(orderId: number, reason: string, logout: Logout) {
    return callApi<{ online_order: OnlineOrder }>(
        ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.cancel(orderId),
        { method: "POST", body: JSON.stringify({ reason }) },
        logout
    );
}
