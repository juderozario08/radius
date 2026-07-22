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
            STORE: {
                getAll: "/api/admin/get_all_stores",
                update: "api/admin/update_store",
                create: "api/admin/create_store",
                activate: "api/admin/activate_store",
                deactivate: "api/admin/deactivate_store"
            }
        },
        MANAGER: {
        },
        SALES: {
        },
    }
};
