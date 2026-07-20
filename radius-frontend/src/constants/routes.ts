//radius-frontend/src/constants/routes.ts

export const ENDPOINTS = {
    UNAUTHENTICATED: {
        login: "/login",
    },
    AUTHENTICATED: {
        logout: "/api/logout",
        verify_token: "/api/verify_token",
        ADMIN: {
            EMPLOYEES: {
                getAll: "/api/admin/get_all_employees",
                create: "/api/admin/create_employee",
                update: "/api/admin/update_employee",
                terminate: "/api/admin/terminate_employee",
                activate: "/api/admin/activate_employee",
            },
            SESSIONS: {
                getAll: "/api/admin/get_all_sessions",
                terminate: "/api/admin/terminate_session",
            },
        },
        MANAGER: {
        },
        SALES: {
        },
    }
};
