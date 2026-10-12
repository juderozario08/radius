import { ENDPOINTS } from "@/constants/routes";
import { SearchProductsResponse } from "@/types/inventory.types";
import { CreateTransferRequest, DestinationStore, DispatchTransferRequest, GetAllOutboundTransfersResponse, OutboundTransferDetailResponse } from "@/types/receiving.types";
import { callApi } from "@/utils/helpers";

type Logout = () => Promise<void>;

export function getOutboundTransfers(page: number, size: number, logout: Logout) {
    const endpoint = `${ENDPOINTS.SALES_FLOOR.TRANSFERS.getAll}?page_number=${page}&page_size=${size}`;
    return callApi<GetAllOutboundTransfersResponse>(endpoint, { method: "GET" }, logout);
}

export function getTransferDestinationStores(logout: Logout) {
    return callApi<{ stores: DestinationStore[] }>(ENDPOINTS.SALES_FLOOR.TRANSFERS.stores, { method: "GET" }, logout);
}

export function getOutboundTransferDetail(transferId: number, logout: Logout) {
    return callApi<OutboundTransferDetailResponse>(ENDPOINTS.SALES_FLOOR.TRANSFERS.getDetail(transferId), { method: "GET" }, logout);
}

export function dispatchOutboundTransfer(transferId: number, carrier: string | null, trackingNumber: string | null, logout: Logout) {
    const body: DispatchTransferRequest = { carrier, tracking_number: trackingNumber };
    return callApi<{ message: string }>(ENDPOINTS.SALES_FLOOR.TRANSFERS.dispatch(transferId), {
        method: "POST",
        body,
    }, logout);
}

export function cancelOutboundTransfer(transferId: number, logout: Logout) {
    return callApi<{ message: string }>(ENDPOINTS.SALES_FLOOR.TRANSFERS.cancel(transferId), { method: "POST" }, logout);
}

export function searchTransferProducts(query: string, signal: AbortSignal, logout: Logout) {
    const endpoint = `${ENDPOINTS.SALES_FLOOR.PRODUCTS.search}?q=${encodeURIComponent(query)}&limit=8&offset=0`;
    return callApi<SearchProductsResponse>(endpoint, { method: "GET", signal }, logout);
}

export function createOutboundTransfer(body: CreateTransferRequest, logout: Logout) {
    return callApi<{ message: string }>(ENDPOINTS.SALES_FLOOR.TRANSFERS.create, { method: "POST", body }, logout);
}
