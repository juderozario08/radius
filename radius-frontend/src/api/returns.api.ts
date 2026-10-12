import { ENDPOINTS } from "@/constants/routes";
import {
    CreateReturnRequest,
    CustomerReturnDetailResponse,
    CustomerReturnSummary,
    LookupTransactionResponse,
    RecentTransactionSummary,
    RtvQueueItem,
} from "@/types/returns.types";
import { callApi } from "@/utils/helpers";
import { Money } from "@/utils/money";

type Logout = () => Promise<void>;

export function lookupReturnTransaction(transactionId: string | number, logout: Logout) {
    return callApi<LookupTransactionResponse>(ENDPOINTS.SALES_FLOOR.RETURNS.lookup(transactionId), { method: "GET" }, logout);
}

export function searchReturnTransactions(barcode: string, logout: Logout) {
    const endpoint = `${ENDPOINTS.SALES_FLOOR.RETURNS.searchByProduct}?barcode=${encodeURIComponent(barcode)}`;
    return callApi<{ transactions: RecentTransactionSummary[] }>(endpoint, { method: "GET" }, logout);
}

export function createReturn(body: CreateReturnRequest, logout: Logout) {
    return callApi<{ return_id: number; status: string; total_refund: Money }>(ENDPOINTS.SALES_FLOOR.RETURNS.create, { method: "POST", body }, logout);
}

export function getReturnHistory(page: number, status: string, logout: Logout) {
    let endpoint = `${ENDPOINTS.SALES_FLOOR.RETURNS.getAll}?page=${page}&limit=10`;
    if (status !== "ALL") endpoint += `&status=${status}`;
    return callApi<{ returns: CustomerReturnSummary[]; total_length: number }>(endpoint, { method: "GET" }, logout);
}

export function getReturnDetail(returnId: number, logout: Logout) {
    return callApi<CustomerReturnDetailResponse>(ENDPOINTS.SALES_FLOOR.RETURNS.getDetail(returnId), { method: "GET" }, logout);
}

export function getRtvQueue(page: number, logout: Logout) {
    const endpoint = `${ENDPOINTS.SALES_FLOOR.RETURNS.rtv}?page=${page}&limit=15`;
    return callApi<{ rtv_queue: RtvQueueItem[]; total_length: number }>(endpoint, { method: "GET" }, logout);
}

export function approveReturn(returnId: number, logout: Logout) {
    return callApi<{ message: string }>(ENDPOINTS.SALES_FLOOR.RETURNS.approve(returnId), { method: "POST" }, logout);
}

export function rejectReturnRequest(returnId: number, reason: string, logout: Logout) {
    return callApi<{ message: string }>(ENDPOINTS.SALES_FLOOR.RETURNS.reject(returnId), { method: "POST", body: { reason } }, logout);
}
