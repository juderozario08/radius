export type EmployeeRole = "SALES" | "SERVICE" | "MANAGER" | "ADMIN";

export type LoginResponse = {
    token: string;
    session_id: number;
    employee_id: number;
    last_name: string;
    role: EmployeeRole;
    store_id: number;
};

export type LogoutResponse = {
    message: string;
};
