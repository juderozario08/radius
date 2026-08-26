//radius-frontend/src/constants/routes.ts
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
            create: "/api/admin/employees/create",
            update: "/api/admin/employees/update",
            terminate: "/api/admin/employees/terminate",
            activate: "/api/admin/employees/activate",
        },
        SESSIONS: {
            getAll: "/api/admin/sessions",
            terminate: "/api/admin/sessions/terminate",
        },
        STORES: {
            getAll: "/api/admin/stores",
            update: "/api/admin/stores/update",
            create: "/api/admin/stores/create",
            activate: "/api/admin/stores/activate",
            deactivate: "/api/admin/stores/deactivate",
        },
    },
    MANAGER: {
        STORE: {
            get: "/api/manager/store",
        },
        EMPLOYEES: {
            getAll: "/api/manager/employees",
        },
    },
    SALES_FLOOR: {
        PRODUCTS: {
            get: "/api/sales_floor/products/get",
            search: "/api/sales_floor/products/search",
            categories: "/api/sales_floor/products/categories",
            brands: "/api/sales_floor/products/brands",
            audit: "/api/sales_floor/products/audit",
        },
        TRANSACTIONS: {
            getAll: "/api/sales_floor/transactions",
            get: "/api/sales_floor/transactions/get",
        },
        ORDERS: {
            ONLINE: {
                getAll: "/api/sales_floor/orders/online",
                get: "/api/sales_floor/orders/online/get",
            },
            PRINT: {
                getAll: "/api/sales_floor/orders/print",
                get: "/api/sales_floor/orders/print/get",
            },
        },
        IS4TC: {
            session: "/api/sales_floor/is4tc/session",
            addToSession: "/api/sales_floor/is4tc/session/add",
            clearSession: "/api/sales_floor/is4tc/session/clear",
        },
        INVENTORY: {
            scanProduct: "/api/sales_floor/inventory/product",
            productDetails: "/api/sales_floor/inventory/product-details",
            getLocationProducts: "/api/sales_floor/inventory/location",
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
            purchaseOrder: "/api/sales_floor/receiving/purchase_order",
            checkProduct: "/api/sales_floor/receiving/check_product",
            receivePo: "/api/sales_floor/receiving/receive_po",
            receiveLpr: "/api/sales_floor/receiving/receive_lpr",
            transfers: "/api/sales_floor/receiving/transfers",
            transfer: "/api/sales_floor/receiving/transfer",
            checkTransferProduct: "/api/sales_floor/receiving/check_transfer_product",
            receiveTransfer: "/api/sales_floor/receiving/receive_transfer",
            quickReceiveTransfer: "/api/sales_floor/receiving/quick_receive_transfer",
        },
        CYCLE_COUNT: {
            getWeekly: "/api/sales_floor/cycle_counts",
            getDetail: "/api/sales_floor/cycle_counts/detail",
            getItems: "/api/sales_floor/cycle_counts/items",
            start: "/api/sales_floor/cycle_counts/start",
            scan: "/api/sales_floor/cycle_counts/scan",
            submit: "/api/sales_floor/cycle_counts/submit",
            approve: "/api/sales_floor/cycle_counts/approve",
            search: "/api/sales_floor/cycle_counts/search",
            schedule: "/api/sales_floor/cycle_counts/schedule",
            transfer: "/api/sales_floor/cycle_counts/transfer",
        },
    },
};
