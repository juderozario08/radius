//radius-frontend/src/types/auth.types.ts
export type EmployeeRole = "SALES" | "SERVICE" | "MANAGER" | "ADMIN";

export interface LoginResponse {
    token: string;
    refresh_token: string;
    session_id: number;
    employee_id: number;
    last_name: string;
    role: EmployeeRole;
    store_id: number;
};

export interface LogoutResponse {
    message: string;
};

export interface VerifyTokenResponse {
    message: string;
};

export interface RefreshTokenResponse {
    token: string;
};
