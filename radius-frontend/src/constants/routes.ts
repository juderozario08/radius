//radius-frontend/src/constants/routes.ts

export const ENDPOINTS = {
    ADMIN: {
        EMPLOYEES: {
            getAll: "/api/admin/get_all_employees",
            create: "/api/admin/create_employee",
            update: "/api/admin/update_employee",
            terminate: "/api/admin/terminate_employee",
        },
        SESSIONS: {
            getAll: "/api/admin/get_all_sessions",
            terminate: "/api/admin/terminate_session",
        },
    }
};
