//radius-frontend/src/constants/routes.ts
export const ENDPOINTS = {
    UNAUTHENTICATED: {
        login: "/login",
        refresh_token: "/api/refresh_token",
    },
    AUTHENTICATED: {
        logout: "/api/logout",
        verify_token: "/api/verify_token",
        PRODUCTS: {
            get: "/api/sales_floor/get_product",
            search: "/api/sales_floor/search_products",
            categories: "/api/sales_floor/get_all_categories",
            brands: "/api/sales_floor/get_distinct_brands",
        },
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
                update: "/api/admin/update_store",
                create: "/api/admin/create_store",
                activate: "/api/admin/activate_store",
                deactivate: "/api/admin/deactivate_store"
            }
        },
        MANAGER: {
            STORE: {
                get: "/api/manager/get_store",
            },
            EMPLOYEES: {
                getAll: "/api/manager/get_employees",
            }
        },
        SALES: {
            TRANSACTIONS: {
                getAll: "/api/sales_floor/get_all_transactions",
                get: "/api/sales_floor/get_transaction",
            }
        },
        SERVICE: {
            ONLINE_ORDERS: {
                getAll: "/api/sales_floor/get_all_online_orders",
                get: "/api/sales_floor/get_online_order",
            }
        },
        MIMS: {
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
    }
};
