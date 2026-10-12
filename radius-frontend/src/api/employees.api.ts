import { ENDPOINTS } from "@/constants/routes";
import { GetAllEmployeeResponse } from "@/types/admin.types";
import { callApi } from "@/utils/helpers";

export function getAssignableEmployees(role: string | undefined, storeId: number | undefined, logout: () => Promise<void>) {
    const storeParam = storeId ? `&store_id=${storeId}` : "";
    const endpoint = role === "ADMIN"
        ? `${ENDPOINTS.ADMIN.EMPLOYEES.getAll}?page_size=100&page_number=1${storeParam}`
        : `${ENDPOINTS.MANAGER.EMPLOYEES.getAll}?page_size=100&page_number=1${storeParam}`;
    return callApi<GetAllEmployeeResponse>(endpoint, { method: "GET" }, logout);
}
