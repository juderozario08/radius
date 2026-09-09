import { EmployeeRole } from "./auth.types";

export interface Employee {
    employee_id: number;
    store_id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: EmployeeRole;
    phone: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    is_active: boolean;
    is_terminated: boolean;
}

export interface GetAllEmployeeResponse {
    message: string;
    total_length: number;
    employees: Employee[];
}

export interface Session {
    session_id: number;
    ip_address: string;
    employee_id: number;
    store_id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    phone: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    is_active: boolean;
    is_current?: boolean;
}

export interface GetAllSessionsResponse {
    sessions: Session[];
    total_length: number;
    message: string;
    current_session_id?: number;
}

export interface Store {
    store_id: number;
    name: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    phone: string;
    timezone: string;
    is_active: boolean;
    created_at: string;
}

export interface GetAllStoresResponse {
    stores: Store[];
    total_length: number;
    message: string;
}

export interface GetStoreResponse {
    store: Store;
    message: string;
}

export interface CreateStoreResponse {
    store: Store;
    message: string;
}

export interface MessageResponse {
    message: string;
}

export interface StoreOperationSummary {
    store_id: number;
    name: string;
    address: string;
    city: string;
    province: string;
    is_active: boolean;
    is_head_office: boolean;
    active_orders_count: number;
    active_counts_count: number;
    pending_pos_count: number;
    has_active_operations: boolean;
}
