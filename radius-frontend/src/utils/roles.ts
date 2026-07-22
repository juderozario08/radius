//radius-frontend/src/utils/roles.ts
import { EmployeeRole } from "@/types/auth.types";

export type Permission =
    | 'view_sales_floor'
    | 'view_back_room'
    | 'view_admin_actions'
    | 'view_service_actions'
    | 'view_manager_actions'

export const ROLE_PERMISSIONS: Record<EmployeeRole, Permission[]> = {
    SALES: [
        'view_back_room',
        'view_sales_floor',
    ],
    SERVICE: [
        'view_back_room',
        'view_sales_floor',
        'view_service_actions',
    ],
    MANAGER: [
        'view_sales_floor',
        'view_back_room',
        'view_service_actions',
        'view_manager_actions',
    ],
    ADMIN: [
        'view_sales_floor',
        'view_back_room',
        'view_admin_actions',
        'view_service_actions',
        'view_manager_actions',
    ],
};

export function hasPermission(role: EmployeeRole | undefined | null, permission: Permission): boolean {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
