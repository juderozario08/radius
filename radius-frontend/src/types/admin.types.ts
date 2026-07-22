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
}

export interface GetAllSessionsResponse {
    sessions: Session[];
    message: string;
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
