import { ENDPOINTS } from "@/constants/routes";
import { GetAllEmployeeResponse } from "@/types/admin.types";
import { EmployeeRole } from "@/types/auth.types";
import { callApi } from "@/utils/helpers";

export function getAssignableEmployees(role: string | undefined, storeId: number | undefined, logout: () => Promise<void>) {
    const storeParam = storeId ? `&store_id=${storeId}` : "";
    const endpoint = role === "ADMIN"
        ? `${ENDPOINTS.ADMIN.EMPLOYEES.getAll}?page_size=100&page_number=1${storeParam}`
        : `${ENDPOINTS.MANAGER.EMPLOYEES.getAll}?page_size=100&page_number=1${storeParam}`;
    return callApi<GetAllEmployeeResponse>(endpoint, { method: "GET" }, logout);
}

export type EmployeeFormPayload = {
    first_name: string;
    last_name: string;
    email: string;
    password?: string;
    role: EmployeeRole;
    phone: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    store_id: number;
    is_active: boolean;
    is_terminated: boolean;
};

export function getEmployees(page: number, limit: number, storeId: string | undefined, logout: () => Promise<void>) {
    let endpoint = `${ENDPOINTS.ADMIN.EMPLOYEES.getAll}?page_number=${page}&page_size=${limit}`;
    if (storeId) endpoint += `&store_id=${storeId}`;
    return callApi<GetAllEmployeeResponse>(endpoint, { method: "GET" }, logout);
}

export function terminateEmployee(employeeId: number, logout: () => Promise<void>) {
    return callApi(ENDPOINTS.ADMIN.EMPLOYEES.terminate(employeeId), { method: "POST" }, logout);
}

export function activateEmployee(employeeId: number, logout: () => Promise<void>) {
    return callApi(ENDPOINTS.ADMIN.EMPLOYEES.activate(employeeId), { method: "POST" }, logout);
}

export function saveEmployee(employeeId: number | null, body: EmployeeFormPayload, logout: () => Promise<void>) {
    const endpoint = employeeId !== null ? ENDPOINTS.ADMIN.EMPLOYEES.update(employeeId) : ENDPOINTS.ADMIN.EMPLOYEES.create;
    return callApi(endpoint, { method: employeeId !== null ? "PUT" : "POST", body }, logout);
}
