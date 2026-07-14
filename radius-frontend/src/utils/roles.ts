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
    | 'delete_employees'
    | 'view_transfers'
    | 'approve_po'

    | 'submit_item_adjustment'
    | 'delete_own_item_adjustment'
    | 'adjust_inventory'

    | 'perform_cycle_count'
    | 'approve_cycle_count'
    | 'process_returns'

export const ROLE_PERMISSIONS: Record<EmployeeRole, Permission[]> = {
    SALES: [
        'view_sales_floor',
        'view_inventory',
        'view_orders',
        'submit_item_adjustment',
        'delete_own_item_adjustment',
        'approve_po',
    ],
    SERVICE: [
        'view_sales_floor',
        'view_inventory',
        'view_orders',
        'process_returns',
        'submit_item_adjustment',
        'approve_po',
        'delete_own_item_adjustment',
    ],
    MANAGER: [
        'view_sales_floor',
        'view_back_room',
        'view_inventory',
        'view_orders',
        'view_employees',
        'view_transfers',
        'submit_item_adjustment',
        'delete_own_item_adjustment',
        'adjust_inventory',
        'perform_cycle_count',
        'process_returns',
        'approve_cycle_count',
        'approve_po',
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

        'submit_item_adjustment',
        'delete_own_item_adjustment',
        'adjust_inventory',
        'perform_cycle_count',
        'process_returns',
        'delete_employees',
    ],
};

export function hasPermission(role: EmployeeRole | undefined | null, permission: Permission): boolean {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
