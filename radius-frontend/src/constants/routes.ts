export type RouteBuilder = {
    (id?: string | number, subId?: string | number): string;
    template: string;
    toString: () => string;
};

export function createRoute(template: string): RouteBuilder {
    const fn = ((id?: string | number, subId?: string | number) => {
        if (id === undefined) {
            return template.replace(/\/:id$/, "");
        }
        let result = template.replace(/:id\b/, encodeURIComponent(String(id)));
        if (subId !== undefined) {
            result = result.replace(/:item_id\b/, encodeURIComponent(String(subId)));
        } else {
            result = result.replace(/\/:item_id\b/, "");
        }
        return result;
    }) as RouteBuilder;
    fn.template = template;
    fn.toString = () => template;
    return fn;
}

export function buildRoute(template: string, params: Record<string, string | number>): string {
    let result = template;
    for (const [key, value] of Object.entries(params)) {
        result = result.replace(new RegExp(`:${key}\\b`, "g"), encodeURIComponent(String(value)));
    }
    return result;
}

export const ENDPOINTS = {
    AUTH: {
        login: "/login",
        refreshToken: "/api/refresh_token",
        logout: "/api/logout",
        verifyToken: "/api/verify_token",
    },
    ADMIN: {
        EMPLOYEES: {
            getAll: "/api/admin/employees",
            create: "/api/admin/employees",
            update: createRoute("/api/admin/employees/:id"),
            terminate: createRoute("/api/admin/employees/:id/terminate"),
            activate: createRoute("/api/admin/employees/:id/activate"),
        },
        SESSIONS: {
            getAll: "/api/admin/sessions",
            terminate: createRoute("/api/admin/sessions/:id"),
        },
        STORES: {
            getAll: "/api/admin/stores",
            operations: "/api/admin/stores/operations",
            get: createRoute("/api/admin/stores/:id"),
            create: "/api/admin/stores",
            update: createRoute("/api/admin/stores/:id"),
            activate: createRoute("/api/admin/stores/:id/activate"),
            deactivate: createRoute("/api/admin/stores/:id/deactivate"),
        },
    },
    MANAGER: {
        STORE: {
            get: createRoute("/api/manager/store/:id"),
        },
        EMPLOYEES: {
            getAll: "/api/manager/employees",
        },
    },
    SALES_FLOOR: {
        PRODUCTS: {
            get: createRoute("/api/sales_floor/products/:id"),
            search: "/api/sales_floor/products/search",
            categories: "/api/sales_floor/products/categories",
            brands: "/api/sales_floor/products/brands",
            audit: "/api/sales_floor/products/audit",
        },
        TRANSACTIONS: {
            getAll: "/api/sales_floor/transactions",
            get: createRoute("/api/sales_floor/transactions/:id"),
            create: "/api/sales_floor/transactions",
        },
        ORDERS: {
            ONLINE: {
                getAll: "/api/sales_floor/orders/online",
                get: createRoute("/api/sales_floor/orders/online/:id"),
                create: "/api/sales_floor/orders/online",
                assign: createRoute("/api/sales_floor/orders/online/:id/assign"),
                updateItem: createRoute("/api/sales_floor/orders/online/:id/items/:item_id"),
                completePick: createRoute("/api/sales_floor/orders/online/:id/complete_pick"),
                cancel: createRoute("/api/sales_floor/orders/online/:id/cancel"),
            },
            PRINT: {
                getAll: "/api/sales_floor/orders/print",
                get: createRoute("/api/sales_floor/orders/print/:id"),
            },
        },
        IS4TC: {
            session: "/api/sales_floor/is4tc/session",
            addToSession: "/api/sales_floor/is4tc/session/add",
            clearSession: "/api/sales_floor/is4tc/session/clear",
        },
        FILL_REPORT: {
            get: "/api/sales_floor/fill_reports",
            emptyHole: "/api/sales_floor/fill_reports/empty_hole",
        },
        INVENTORY: {
            scanProduct: "/api/sales_floor/inventory/product",
            productDetails: createRoute("/api/sales_floor/inventory/products/:id"),
            getLocationProducts: createRoute("/api/sales_floor/inventory/locations/:id"),
            binItem: "/api/sales_floor/inventory/bin",
            updateQuantity: "/api/sales_floor/inventory/quantity",
            syncLocations: "/api/sales_floor/inventory/locations/sync",
            createLocation: "/api/sales_floor/inventory/location",
            adjustInventory: "/api/sales_floor/inventory/adjust",
            adjustments: "/api/sales_floor/inventory/adjustments",
            adjustmentsReview: "/api/sales_floor/inventory/adjustments/review",
        },
        RECEIVING: {
            purchaseOrders: "/api/sales_floor/receiving/purchase_orders",
            purchaseOrder: createRoute("/api/sales_floor/receiving/purchase_orders/:id"),
            checkProduct: createRoute("/api/sales_floor/receiving/purchase_orders/:id/check_product"),
            receivePo: createRoute("/api/sales_floor/receiving/purchase_orders/:id/receive"),
            receiveLpr: createRoute("/api/sales_floor/receiving/purchase_orders/:id/receive_lpr"),
            transfers: "/api/sales_floor/receiving/transfers",
            transfer: createRoute("/api/sales_floor/receiving/transfers/:id"),
            checkTransferProduct: createRoute("/api/sales_floor/receiving/transfers/:id/check_product"),
            receiveTransfer: createRoute("/api/sales_floor/receiving/transfers/:id/receive"),
            quickReceiveTransfer: createRoute("/api/sales_floor/receiving/transfers/:id/quick_receive"),
        },
        TRANSFERS: {
            getAll: "/api/sales_floor/transfers",
            getDetail: createRoute("/api/sales_floor/transfers/:id"),
            create: "/api/sales_floor/transfers",
            dispatch: createRoute("/api/sales_floor/transfers/:id/dispatch"),
            cancel: createRoute("/api/sales_floor/transfers/:id/cancel"),
            stores: "/api/sales_floor/transfers/stores",
        },
        CYCLE_COUNT: {
            getWeekly: "/api/sales_floor/cycle_counts",
            getDetail: createRoute("/api/sales_floor/cycle_counts/:id"),
            getItems: createRoute("/api/sales_floor/cycle_counts/:id/items"),
            start: "/api/sales_floor/cycle_counts",
            scan: createRoute("/api/sales_floor/cycle_counts/:id/scans"),
            submit: createRoute("/api/sales_floor/cycle_counts/:id/submit"),
            approve: createRoute("/api/sales_floor/cycle_counts/:id/approve"),
            search: "/api/sales_floor/cycle_counts/search",
            schedule: "/api/sales_floor/cycle_counts/schedule",
            transfer: createRoute("/api/sales_floor/cycle_counts/:id/transfer_ownership"),
        },
        RETURNS: {
            getAll: "/api/sales_floor/returns",
            getDetail: createRoute("/api/sales_floor/returns/:id"),
            create: "/api/sales_floor/returns",
            approve: createRoute("/api/sales_floor/returns/:id/approve"),
            reject: createRoute("/api/sales_floor/returns/:id/reject"),
            lookup: createRoute("/api/sales_floor/returns/lookup/:id"),
            searchByProduct: "/api/sales_floor/returns/search_by_product",
            rtv: "/api/sales_floor/returns/rtv",
        },
    },
};
