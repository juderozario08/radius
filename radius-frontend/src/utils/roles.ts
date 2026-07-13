//radius-frontend/src/utils/roles.ts
import { EmployeeRole } from "@/types/auth.types";

export type Permission =
    | 'view_sales_floor'
    | 'view_back_room'
    | 'view_admin_actions'

    | 'view_inventory'
    | 'view_orders'
    | 'view_employees'
    | 'create_employee'
    | 'view_transfers'
    | 'approve_po'
    | 'adjust_inventory'
    | 'perform_cycle_count'
    | 'process_returns'
    | 'receive_freight';

export const ROLE_PERMISSIONS: Record<EmployeeRole, Permission[]> = {
    SALES: [
        'view_sales_floor',
        'view_inventory',
        'view_orders'
    ],
    SERVICE: [
        'view_sales_floor',
        'view_inventory',
        'view_orders',
        'process_returns'
    ],
    MANAGER: [
        'view_sales_floor',
        'view_back_room',
        'view_inventory',
        'view_orders',
        'view_employees',
        'view_transfers',
        'adjust_inventory',
        'perform_cycle_count',
        'process_returns',
        'receive_freight'
    ],
    ADMIN: [
        'view_sales_floor',
        'view_back_room',
        'view_admin_actions',
        'view_inventory',
        'view_orders',
        'view_employees',
        'create_employee',
        'view_transfers',
        'approve_po',
        'adjust_inventory',
        'perform_cycle_count',
        'process_returns',
        'receive_freight'
    ],
};

export function hasPermission(role: EmployeeRole | undefined | null, permission: Permission): boolean {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
