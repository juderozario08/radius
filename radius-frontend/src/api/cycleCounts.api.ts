import { ENDPOINTS } from "@/constants/routes";
import { CycleCountDetailResponse } from "@/types/cyclecount.types";
import { callApi } from "@/utils/helpers";

type Logout = () => Promise<void>;

export function getCycleCountDetail(countId: number, logout: Logout) {
    return callApi<CycleCountDetailResponse>(ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.getDetail(countId), { method: "GET" }, logout);
}

export function transferCycleCount(countId: number, employeeId: number, logout: Logout) {
    return callApi(ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.transfer(countId), { method: "POST", body: JSON.stringify({ employee_id: employeeId }) }, logout);
}

export function scanCycleCountItem(countId: number, productId: number, countedQty: number, reason: string | undefined, logout: Logout) {
    return callApi(
        ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.scan(countId),
        { method: "POST", body: JSON.stringify({ product_id: productId, counted_qty: countedQty, reason_code: reason }) },
        logout
    );
}

export function submitCycleCount(countId: number, notes: string | undefined, logout: Logout) {
    return callApi(ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.submit(countId), { method: "POST", body: JSON.stringify({ notes }) }, logout);
}

export function approveCycleCount(countId: number, logout: Logout) {
    return callApi(ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.approve(countId), { method: "POST" }, logout);
}
