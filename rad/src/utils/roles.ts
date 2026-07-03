export type EmployeeRole = 'SALES' | 'SERVICE' | 'MANAGER' | 'ADMIN';

export type Permission = 'view_employees' | 'create_employee' | 'view_transfers' | 'approve_po' | 'view_inventory' | 'view_orders';

const rolePermissions: Record<EmployeeRole, Permission[]> = {
    SALES: ['view_inventory'],
    SERVICE: ['view_inventory', 'view_orders'],
    MANAGER: ['view_inventory', 'view_orders', 'view_employees', 'view_transfers'],
    ADMIN: ['view_inventory', 'view_orders', 'view_employees', 'view_transfers', 'create_employee', 'approve_po'],
};

export function hasPermission(role: EmployeeRole, permission: Permission): boolean {
    return rolePermissions[role].includes(permission);
}
