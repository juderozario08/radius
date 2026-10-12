import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import LogoutComponent from "@/components/common/Logout";
import NotificationIconComponent from "@/components/common/NotificationIcon";
import { ConnectionStatusBadge } from "@/components/common/ConnectionStatusBadge";
import { OrderCard } from "@/components/orders/OrderCard";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { callApi } from "@/utils/helpers";
import { ENDPOINTS } from "@/constants/routes";
import {
    OrderCreatedPayload,
    CycleCountUpdatedPayload,
    StoreActivityPayload,
} from "@/types/websocket.types";
import { GetAllOnlineOrdersResponse } from "@/types/order.types";
import { CycleCountSummary } from "@/types/cyclecount.types";
import { PurchaseOrderSummary } from "@/types/receiving.types";
import { StoreOperationsCard } from "@/components/store/StoreOperationsCard";
import { StoreOperationSummary } from "@/types/admin.types";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatMoney } from "@/utils/money";

type TabView = "overview" | "orders" | "cycle_counts" | "activities";
type ScopeView = "my_tasks" | "store_wide";

export const isDashboardEligibleOrder = (order: { order_type?: string; status?: string }): boolean => {
    const type = (order.order_type || "").toUpperCase();
    const status = (order.status || "").toUpperCase();

    if (type === "STS") {
        return ["SHIPPED", "DELIVERING", "DELIVERED"].includes(status);
    }
    if (type === "BOPIS") {
        return ["WORK IN PROGRESS", "PENDING", "PLACED"].includes(status);
    }
    return false;
};

export default function RealTimeDashboard() {
    const { user, logout } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const [selectedStore, setSelectedStore] = useState<StoreOperationSummary | null>(null);
    const [storeOperations, setStoreOperations] = useState<StoreOperationSummary[]>([]);
    const [loadingStores, setLoadingStores] = useState(false);

    const [activeTab, setActiveTab] = useState<TabView>("overview");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const isAssociate = user?.role === "SALES" || user?.role === "SERVICE";
    const [viewScope, setViewScope] = useState<ScopeView>(isAssociate ? "my_tasks" : "store_wide");

    useEffect(() => {
        if (user?.role) {
            const isReg = user.role === "SALES" || user.role === "SERVICE";
            setViewScope(isReg ? "my_tasks" : "store_wide");
        }
    }, [user?.role]);

    const activeStoreId = isAdmin && selectedStore ? selectedStore.store_id : (user?.store_id ?? 2);

    const loadStoreOperations = useCallback(async () => {
        if (!isAdmin) return;
        setLoadingStores(true);
        const res = await callApi<StoreOperationSummary[]>(
            ENDPOINTS.ADMIN.STORES.operations,
            { method: "GET" },
            logout
        );
        if (res && Array.isArray(res)) {
            setStoreOperations(res);
        }
        setLoadingStores(false);
    }, [isAdmin, logout]);

    const [liveOrders, setLiveOrders] = useState<OrderCreatedPayload[]>([]);
    const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
    const [liveCycleCounts, setLiveCycleCounts] = useState<CycleCountUpdatedPayload[]>([]);
    const [liveActivities, setLiveActivities] = useState<StoreActivityPayload[]>([]);

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const toastOpacity = useRef(new Animated.Value(0)).current;

    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        Animated.sequence([
            Animated.timing(toastOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.delay(3500),
            Animated.timing(toastOpacity, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
            }),
        ]).start(() => setToastMessage(null));
    }, [toastOpacity]);

    const {
        connectionStatus,
        isConnected,
        reconnect,
        sendPing,
    } = useWebSocket({
        storeId: activeStoreId,
        autoConnect: true,
        maxHistorySize: 100,
        onOrderCreated: (payload) => {
            if (isAdmin && !selectedStore) {
                loadStoreOperations();
            }
            if (!isDashboardEligibleOrder(payload)) {
                return;
            }

            setLiveOrders((prev) => {
                const exists = prev.some((o) => o.order_id === payload.order_id);
                if (exists) return prev;
                return [payload, ...prev];
            });
            setNewOrderIds((prev) => new Set(prev).add(payload.order_id));
            showToast(`⚡ Live Order #${payload.order_id} Received (${payload.order_type} - ${formatMoney(payload.total_amount)})`);

            setLiveActivities((prev) => {
                const newAct: StoreActivityPayload = {
                    activity_id: `act-order-${payload.order_id}-${Date.now()}`,
                    store_id: payload.store_id,
                    activity_type: "ORDER_PLACED",
                    title: `New Online Order #${payload.order_id}`,
                    description: `${payload.customer_name} placed ${payload.order_type} order with ${payload.items_count} item(s)`,
                    timestamp: payload.placed_at || new Date().toISOString(),
                    metadata: {
                        order_id: payload.order_id,
                        order_type: payload.order_type,
                        assigned_to: payload.assigned_to,
                    },
                };
                return [newAct, ...prev.filter((a) => a.activity_id !== newAct.activity_id)];
            });
        },
        onOrderStatusUpdated: (payload) => {
            if (isAdmin && !selectedStore) {
                loadStoreOperations();
            }
            const isEligible = isDashboardEligibleOrder({
                order_type: payload.order_type,
                status: payload.new_status,
            });

            setLiveOrders((prev) => {
                const exists = prev.some((o) => o.order_id === payload.order_id);

                if (!isEligible) {
                    return prev.filter((o) => o.order_id !== payload.order_id);
                }

                if (exists) {
                    return prev.map((o) =>
                        o.order_id === payload.order_id
                            ? {
                                ...o,
                                status: payload.new_status,
                                assigned_to: payload.assigned_to !== undefined ? payload.assigned_to : o.assigned_to,
                                assigned_to_name: payload.assigned_to_name !== undefined ? payload.assigned_to_name : o.assigned_to_name,
                            }
                            : o
                    );
                }

                return [
                    {
                        order_id: payload.order_id,
                        store_id: payload.store_id,
                        customer_name: payload.customer_name || "Customer",
                        customer_email: "",
                        order_type: payload.order_type,
                        status: payload.new_status,
                        total_amount: payload.total_amount || 0,
                        items_count: 1,
                        placed_at: new Date().toISOString(),
                        assigned_to: payload.assigned_to,
                        assigned_to_name: payload.assigned_to_name,
                    },
                    ...prev,
                ];
            });

            if (payload.assigned_to_name) {
                showToast(`👤 Order #${payload.order_id} assigned to ${payload.assigned_to_name}`);
            } else {
                showToast(`🔄 Order #${payload.order_id} status changed to ${payload.new_status}`);
            }

            setLiveActivities((prev) => {
                const newAct: StoreActivityPayload = {
                    activity_id: `act-status-${payload.order_id}-${Date.now()}`,
                    store_id: payload.store_id,
                    activity_type: "ORDER_STATUS_CHANGED",
                    title: `Order #${payload.order_id} Updated`,
                    description: payload.assigned_to_name
                        ? `Assigned to ${payload.assigned_to_name} (${payload.new_status})`
                        : `Moved from ${payload.previous_status} to ${payload.new_status}`,
                    timestamp: payload.updated_at || new Date().toISOString(),
                    metadata: {
                        order_id: payload.order_id,
                        assigned_to: payload.assigned_to,
                        assigned_to_name: payload.assigned_to_name,
                    },
                };
                return [newAct, ...prev.filter((a) => a.activity_id !== newAct.activity_id)];
            });
        },
        onCycleCountUpdated: (payload) => {
            if (isAdmin && !selectedStore) {
                loadStoreOperations();
            }
            const s = (payload.status || "").toUpperCase();
            const isInProgress = s === "IN PROGRESS" || s === "IN_PROGRESS";

            setLiveCycleCounts((prev) => {
                if (!isInProgress) {
                    return prev.filter((c) => c.count_id !== payload.count_id);
                }
                const index = prev.findIndex((c) => c.count_id === payload.count_id);
                if (index >= 0) {
                    const updated = [...prev];
                    updated[index] = payload;
                    return updated;
                }
                return [payload, ...prev];
            });

            if (isInProgress) {
                showToast(`📊 Cycle Count #${payload.count_id} Updated: ${payload.category_name} (${payload.action})`);
            }

            setLiveActivities((prev) => {
                const newAct: StoreActivityPayload = {
                    activity_id: `act-cycle-${payload.count_id}-${Date.now()}`,
                    store_id: payload.store_id,
                    activity_type: "CYCLE_COUNT_UPDATED",
                    title: `Cycle Count #${payload.count_id} - ${payload.category_name}`,
                    description: `Action: ${payload.action} | Progress: ${payload.counted_items}/${payload.total_items} items`,
                    timestamp: payload.updated_at || new Date().toISOString(),
                    metadata: { count_id: payload.count_id },
                };
                return [newAct, ...prev.filter((a) => a.activity_id !== newAct.activity_id)];
            });
        },
        onStoreActivity: (payload) => {
            if (isAdmin && !selectedStore) {
                loadStoreOperations();
            }
            if (
                payload.activity_type.includes("POS") ||
                payload.activity_type.includes("TRANSACTION") ||
                payload.activity_type.includes("CHECKOUT") ||
                payload.activity_type.includes("FILL") ||
                payload.activity_type.includes("STOCK")
            ) {
                return;
            }
            setLiveActivities((prev) => [
                payload,
                ...prev.filter((a) => a.activity_id !== payload.activity_id),
            ]);
            showToast(`🔔 Store Activity: ${payload.title}`);
        },
    });

    const loadInitialData = useCallback(async (storeIdOverride?: number) => {
        const activities: StoreActivityPayload[] = [];
        const effectiveStoreId = storeIdOverride !== undefined
            ? storeIdOverride
            : (isAdmin && selectedStore ? selectedStore.store_id : user?.store_id);
        const storeParam = effectiveStoreId ? `&store_id=${effectiveStoreId}` : "";
        const storeQueryOnly = effectiveStoreId ? `?store_id=${effectiveStoreId}` : "";

        const ordersRes = await callApi<GetAllOnlineOrdersResponse>(
            `${ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.getAll}?page=1&page_size=40&dashboard_only=true${storeParam}`,
            { method: "GET" },
            logout
        );
        if (ordersRes && ordersRes.online_orders && Array.isArray(ordersRes.online_orders)) {
            const eligible = ordersRes.online_orders.filter(isDashboardEligibleOrder);
            const mapped: OrderCreatedPayload[] = eligible.map((o) => ({
                order_id: o.order_id,
                store_id: o.store_id,
                customer_name: o.customer_name || "Customer",
                customer_email: o.customer_email || "",
                order_type: o.order_type || "BOPIS",
                status: o.status || "PENDING",
                total_amount: Number(o.total_amount) || 0,
                items_count: 1,
                placed_at: o.placed_at || new Date().toISOString(),
                assigned_to: o.assigned_to,
                assigned_to_name: o.assigned_to_name,
            }));
            setLiveOrders(mapped);

            for (const o of eligible) {
                if (o.order_type === "BOPIS") {
                    activities.push({
                        activity_id: `act-bopis-${o.order_id}`,
                        store_id: o.store_id,
                        activity_type: "ORDER_PLACED",
                        title: `BOPIS Order #${o.order_id}`,
                        description: `${o.customer_name} placed order (${o.status}) • ${o.assigned_to_name ? `Assigned to ${o.assigned_to_name}` : "Unassigned"}`,
                        timestamp: o.placed_at || new Date().toISOString(),
                        metadata: {
                            order_id: o.order_id,
                            order_type: o.order_type,
                            assigned_to: o.assigned_to,
                            assigned_to_name: o.assigned_to_name,
                        },
                    });
                } else if (o.order_type === "STS") {
                    activities.push({
                        activity_id: `act-sts-${o.order_id}`,
                        store_id: o.store_id,
                        activity_type: "ORDER_STATUS_CHANGED",
                        title: `STS Order #${o.order_id} In Transit`,
                        description: `Ship-to-Store package (${o.status}) for ${o.customer_name}`,
                        timestamp: o.placed_at || new Date().toISOString(),
                        metadata: {
                            order_id: o.order_id,
                            order_type: o.order_type,
                        },
                    });
                }
            }
        }

        const cancelRes = await callApi<GetAllOnlineOrdersResponse>(
            `${ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.getAll}?page=1&page_size=10&status=CANCELLED${storeParam}`,
            { method: "GET" },
            logout
        );
        if (cancelRes && cancelRes.online_orders && Array.isArray(cancelRes.online_orders)) {
            for (const o of cancelRes.online_orders) {
                activities.push({
                    activity_id: `act-cancel-${o.order_id}`,
                    store_id: o.store_id,
                    activity_type: "ORDER_TIMEOUT",
                    title: `BOPIS Order #${o.order_id} Timed Out`,
                    description: `Pickup expired • Auto-cancelled for ${o.customer_name}`,
                    timestamp: o.fulfilled_at || o.placed_at || new Date().toISOString(),
                    metadata: {
                        order_id: o.order_id,
                        order_type: o.order_type,
                    },
                });
            }
        }

        const countsRes = await callApi<CycleCountSummary[]>(
            `${ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.getWeekly}${storeQueryOnly}`,
            { method: "GET" },
            logout
        );
        if (countsRes && Array.isArray(countsRes)) {
            const inProgressCounts = countsRes.filter((c) => {
                const s = (c.status || "").toUpperCase();
                return s === "IN PROGRESS" || s === "IN_PROGRESS";
            });

            const mappedCounts: CycleCountUpdatedPayload[] = inProgressCounts
                .slice(0, 10)
                .map((c) => ({
                    count_id: c.count_id,
                    store_id: c.store_id,
                    category_id: c.category_id,
                    category_name: c.category_name,
                    status: "IN PROGRESS",
                    action: "scanned",
                    total_items: c.total_items,
                    counted_items: c.counted_items,
                    total_variance_cost: Number(c.total_variance_cost) || 0,
                    updated_at: c.count_date || new Date().toISOString(),
                    counted_by: c.counted_by,
                    counted_by_name: c.counted_by_name,
                }));
            setLiveCycleCounts(mappedCounts);

            for (const c of inProgressCounts) {
                activities.push({
                    activity_id: `act-cycle-${c.count_id}`,
                    store_id: c.store_id,
                    activity_type: "CYCLE_COUNT_UPDATED",
                    title: `Cycle Count #${c.count_id} - ${c.category_name}`,
                    description: `Progress: ${c.counted_items}/${c.total_items} items counted${c.counted_by_name ? ` by ${c.counted_by_name}` : ""}`,
                    timestamp: c.count_date || new Date().toISOString(),
                    metadata: { count_id: c.count_id },
                });
            }
        }

        const posRes = await callApi<PurchaseOrderSummary[]>(
            `${ENDPOINTS.SALES_FLOOR.RECEIVING.purchaseOrders}${storeQueryOnly}`,
            { method: "GET" },
            logout
        );
        if (posRes && Array.isArray(posRes)) {
            const pendingPOs = posRes.filter(
                (po) => po.status !== "RECEIVED" && po.status !== "CANCELLED"
            );
            for (const po of pendingPOs) {
                activities.push({
                    activity_id: `act-po-${po.po_id}`,
                    store_id: po.store_id,
                    activity_type: "RECEIVING_DOCK",
                    title: `PO #${po.po_id} (${po.supplier_name})`,
                    description: `${po.item_count} item(s) • Status: ${po.status}${po.has_lprs ? " (LPR Pallet)" : ""}`,
                    timestamp: po.arrived_at || po.expected_at || po.ordered_at || new Date().toISOString(),
                    metadata: { po_id: po.po_id },
                });
            }
        }

        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const seen = new Set<string>();
        const uniqueActivities = activities.filter((a) => {
            if (seen.has(a.activity_id)) return false;
            seen.add(a.activity_id);
            return true;
        });
        setLiveActivities(uniqueActivities);

        setInitialLoading(false);
    }, [isAdmin, selectedStore, user?.store_id, logout]);

    useEffect(() => {
        if (isAdmin) {
            loadStoreOperations();
        }
    }, [isAdmin, loadStoreOperations]);

    useEffect(() => {
        if (isAdmin) {
            if (selectedStore) {
                setInitialLoading(true);
                loadInitialData(selectedStore.store_id);
            }
        } else {
            loadInitialData(user?.store_id);
        }
    }, [isAdmin, selectedStore, user?.store_id, loadInitialData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        if (isAdmin && !selectedStore) {
            await loadStoreOperations();
        } else {
            await loadInitialData(selectedStore ? selectedStore.store_id : user?.store_id);
        }
        setIsRefreshing(false);
    };

    const handleOrderPress = async (order: OrderCreatedPayload) => {
        const currentEmpId = user?.employee_id;
        const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";

        if (isAdmin) {
            router.push({
                pathname: "/(app)/(tabs)/home/actions/sales_floor/Orders/[id]",
                params: { id: order.order_id, from: "dashboard" },
            });
            return;
        }

        if (order.assigned_to && order.assigned_to !== currentEmpId) {
            const assignee = order.assigned_to_name || "another associate";
            if (!isManagerOrAdmin) {
                showToast(`⚠️ Order #${order.order_id} is currently being worked on by ${assignee}!`);
                return;
            } else {
                showToast(`ℹ️ Order #${order.order_id} is currently assigned to ${assignee}.`);
                router.push({
                    pathname: "/(app)/(tabs)/home/actions/sales_floor/Orders/[id]",
                    params: { id: order.order_id, from: "dashboard" },
                });
                return;
            }
        }

        if (!order.assigned_to) {
            const empName = user?.last_name ? `Associate ${user.last_name}` : "You";
            showToast(`⚡ Claiming Order #${order.order_id} for you...`);

            setLiveOrders((prev) =>
                prev.map((o) =>
                    o.order_id === order.order_id
                        ? { ...o, assigned_to: currentEmpId, assigned_to_name: empName }
                        : o
                )
            );

            const claimed = await callApi(
                ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.assign(order.order_id),
                {
                    method: "PUT",
                    body: JSON.stringify({
                        employee_id: currentEmpId,
                    }),
                },
                logout
            );
            if (claimed === null) {
                setLiveOrders((prev) =>
                    prev.map((o) =>
                        o.order_id === order.order_id
                            ? { ...o, assigned_to: order.assigned_to, assigned_to_name: order.assigned_to_name }
                            : o
                    )
                );
                return;
            }
        }

        router.push({
            pathname: "/(app)/(tabs)/home/actions/sales_floor/Orders/[id]",
            params: { id: order.order_id, from: "dashboard" },
        });
    };

    const handleCycleCountPress = (count: CycleCountUpdatedPayload) => {
        router.push({
            pathname: "/(app)/(tabs)/home/actions/back_room/CycleCountDetail",
            params: { id: count.count_id, from: "dashboard" },
        });
    };

    const handleActivityPress = (act: StoreActivityPayload) => {
        const meta = act.metadata;
        const orderId = meta?.order_id || (act.title.match(/#(\d+)/) ? Number(act.title.match(/#(\d+)/)![1]) : null);
        const countId = meta?.count_id || (act.title.match(/Count #(\d+)/) ? Number(act.title.match(/Count #(\d+)/)![1]) : null);
        const poId = meta?.po_id || (act.title.match(/PO #(\d+)/) ? Number(act.title.match(/PO #(\d+)/)![1]) : null);

        if (act.activity_type.includes("ORDER") && orderId) {
            router.push({
                pathname: "/(app)/(tabs)/home/actions/sales_floor/Orders/[id]",
                params: { id: orderId, from: "dashboard" },
            });
            return;
        }
        if (act.activity_type.includes("CYCLE") && countId) {
            router.push({
                pathname: "/(app)/(tabs)/home/actions/back_room/CycleCountDetail",
                params: { id: String(countId), from: "dashboard" },
            });
            return;
        }
        if (act.activity_type.includes("POS") || act.activity_type.includes("TRANSACTION")) {
            router.push({
                pathname: "/(app)/(tabs)/home/actions/sales_floor/Transactions",
                params: { from: "dashboard" },
            });
            return;
        }
        if (act.activity_type.includes("RECEIVING") || act.activity_type.includes("PO")) {
            if (poId) {
                router.push({
                    pathname: "/(app)/(tabs)/home/actions/back_room/ReceivePO",
                    params: { po_id: String(poId), from: "dashboard" },
                });
            } else {
                router.push({
                    pathname: "/(app)/(tabs)/home/actions/back_room/Receiving",
                    params: { from: "dashboard" },
                });
            }
            return;
        }
        if (act.activity_type.includes("IS4TC") || act.activity_type.includes("FILL")) {
            router.push({
                pathname: "/(app)/(tabs)/home/actions/sales_floor/IS4TC",
                params: { from: "dashboard" },
            });
            return;
        }

        router.push("/(app)/(tabs)/home/actions");
    };

    const currentEmpId = user?.employee_id;
    const myOrders = useMemo(
        () => liveOrders.filter((o) => o.assigned_to === currentEmpId || !o.assigned_to),
        [liveOrders, currentEmpId]
    );

    const displayedOrders = useMemo(
        () => (viewScope === "my_tasks" ? myOrders : liveOrders),
        [viewScope, myOrders, liveOrders]
    );

    const displayedCycleCounts = useMemo(() => {
        const inProgress = liveCycleCounts.filter((c) => {
            const s = (c.status || "").toUpperCase();
            return s === "IN PROGRESS" || s === "IN_PROGRESS";
        });
        return viewScope === "my_tasks"
            ? inProgress.filter(
                (c) =>
                    (c.counted_by && c.counted_by === currentEmpId) ||
                    !c.counted_by_name
            )
            : inProgress;
    }, [viewScope, liveCycleCounts, currentEmpId]);

    const displayedActivities = useMemo(() => {
        const filtered = liveActivities.filter(
            (a) =>
                !a.activity_type.includes("POS") &&
                !a.activity_type.includes("TRANSACTION") &&
                !a.activity_type.includes("CHECKOUT") &&
                !a.activity_type.includes("FILL") &&
                !a.activity_type.includes("STOCK")
        );
        const scoped = viewScope === "my_tasks"
            ? filtered.filter(
                (a) =>
                    a.metadata?.employee_id === currentEmpId ||
                    a.metadata?.assigned_to === currentEmpId ||
                    !a.metadata?.assigned_to
            )
            : filtered;

        const seen = new Set<string>();
        return scoped.filter((a) => {
            if (seen.has(a.activity_id)) return false;
            seen.add(a.activity_id);
            return true;
        });
    }, [viewScope, liveActivities, currentEmpId]);

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerRight={[
                    <NotificationIconComponent key="notif" />,
                    <LogoutComponent key="logout" />,
                ]}
            />

            {toastMessage && (
                <Animated.View style={[styles.toastBanner, { opacity: toastOpacity }]}>
                    <Ionicons name="flash" size={16} color={COLORS.surface} />
                    <Text style={styles.toastText} numberOfLines={2}>
                        {toastMessage}
                    </Text>
                </Animated.View>
            )}

            {isAdmin && !selectedStore ? (
                <FlatList
                    style={globalStyles.container}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing || loadingStores} onRefresh={handleRefresh} colors={[COLORS.primary]} />
                    }
                    data={storeOperations}
                    keyExtractor={(store) => String(store.store_id)}
                    ListHeaderComponent={
                        <>
                            <View style={styles.dashboardHeader}>
                                <View style={styles.titleColumn}>
                                    <Text style={styles.welcomeText}>Admin Operations Control</Text>
                                    <Text style={styles.headerTitle}>Store Operations Hub</Text>
                                </View>
                                <View style={styles.statusColumn}>
                                    <ConnectionStatusBadge
                                        status={connectionStatus}
                                        onPress={() => {
                                            if (!isConnected) {
                                                reconnect();
                                                showToast("Reconnecting to WebSocket server...");
                                            } else {
                                                sendPing();
                                                showToast("Ping heartbeat sent to backend!");
                                            }
                                        }}
                                    />
                                </View>
                            </View>

                            <View style={styles.networkStatsRow}>
                                <View style={styles.networkStatCard}>
                                    <View style={[styles.networkStatIconCircle, { backgroundColor: COLORS.inactiveBg }]}>
                                        <Ionicons name="business" size={15} color={COLORS.primary} />
                                    </View>
                                    <Text style={styles.networkStatValue}>
                                        {storeOperations.filter((s) => s.has_active_operations).length}/{storeOperations.length}
                                    </Text>
                                    <Text style={styles.networkStatLabel}>Active</Text>
                                </View>

                                <View style={styles.networkStatCard}>
                                    <View style={[styles.networkStatIconCircle, { backgroundColor: COLORS.warningBg }]}>
                                        <Ionicons name="cart" size={15} color={COLORS.warning} />
                                    </View>
                                    <Text style={styles.networkStatValue}>
                                        {storeOperations.reduce((sum, s) => sum + s.active_orders_count, 0)}
                                    </Text>
                                    <Text style={styles.networkStatLabel}>Orders</Text>
                                </View>

                                <View style={styles.networkStatCard}>
                                    <View style={[styles.networkStatIconCircle, { backgroundColor: COLORS.infoBg }]}>
                                        <Ionicons name="clipboard" size={15} color={COLORS.info} />
                                    </View>
                                    <Text style={styles.networkStatValue}>
                                        {storeOperations.reduce((sum, s) => sum + s.active_counts_count, 0)}
                                    </Text>
                                    <Text style={styles.networkStatLabel}>Counts</Text>
                                </View>

                                <View style={styles.networkStatCard}>
                                    <View style={[styles.networkStatIconCircle, { backgroundColor: COLORS.activeBg }]}>
                                        <Ionicons name="cube" size={15} color={COLORS.success} />
                                    </View>
                                    <Text style={styles.networkStatValue}>
                                        {storeOperations.reduce((sum, s) => sum + s.pending_pos_count, 0)}
                                    </Text>
                                    <Text style={styles.networkStatLabel}>POs</Text>
                                </View>
                            </View>

                            <View style={styles.hubInstructionBanner}>
                                <Ionicons name="information-circle-outline" size={18} color={COLORS.indigo} />
                                <Text style={styles.hubInstructionText}>
                                    Tap any store branch below to monitor and manage its real-time orders, cycle counts, and dock receiving.
                                </Text>
                            </View>

                            <View style={styles.sectionHeaderRow}>
                                <Text style={globalStyles.sectionTitle}>All Store Branches ({storeOperations.length})</Text>
                                <Text style={styles.sectionSubtext}>Pull to refresh</Text>
                            </View>
                        </>
                    }
                    renderItem={({ item: store }) => (
                        <View style={styles.storeListContainer}>
                            <StoreOperationsCard
                                store={store}
                                onSelect={(st) => {
                                    setSelectedStore(st);
                                }}
                            />
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.storeListContainer}>
                            {loadingStores ? (
                                <View style={styles.loadingContainer}>
                                    <LoadingSpinner />
                                    <Text style={styles.loadingText}>Loading store operational summaries...</Text>
                                </View>
                            ) : (
                                <View style={styles.emptyCard}>
                                    <Ionicons name="business-outline" size={36} color={COLORS.textSecondary} />
                                    <Text style={styles.emptyCardText}>No store locations found.</Text>
                                </View>
                            )}
                        </View>
                    }
                />
            ) : (
                <ScrollView
                    style={globalStyles.container}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
                    }
                >
                    {isAdmin && selectedStore && (
                        <View style={styles.storeSelectedBanner}>
                            <View style={styles.storeSelectedInfo}>
                                <View style={styles.storeSelectedTitleRow}>
                                    <Ionicons name="storefront" size={16} color={COLORS.primary} />
                                    <Text style={styles.storeSelectedName}>{selectedStore.name}</Text>
                                    {selectedStore.is_head_office && (
                                        <View style={styles.hqBadge}>
                                            <Text style={styles.hqText}>HQ</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.storeSelectedSub}>
                                    Store #{selectedStore.store_id} • {selectedStore.city}, {selectedStore.province}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.allStoresButton}
                                onPress={() => setSelectedStore(null)}
                            >
                                <Ionicons name="arrow-back" size={14} color={COLORS.primary} />
                                <Text style={styles.allStoresButtonText}>All Stores</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.dashboardHeader}>
                        <View style={styles.titleColumn}>
                            <Text style={styles.welcomeText}>
                                {selectedStore
                                    ? `${selectedStore.name} • Admin View`
                                    : `Store #${user?.store_id ?? 2} • ${user?.role || "Associate"} View`}
                            </Text>
                            <Text style={styles.headerTitle}>Operational Dashboard</Text>
                        </View>
                        <View style={styles.statusColumn}>
                            <ConnectionStatusBadge
                                status={connectionStatus}
                                onPress={() => {
                                    if (!isConnected) {
                                        reconnect();
                                        showToast("Reconnecting to WebSocket server...");
                                    } else {
                                        sendPing();
                                        showToast("Ping heartbeat sent to backend!");
                                    }
                                }}
                            />
                        </View>
                    </View>

                    <View style={styles.scopeSwitcherContainer}>
                        <TouchableOpacity
                            style={[styles.scopeButton, viewScope === "my_tasks" && styles.scopeButtonActive]}
                            onPress={() => {
                                setViewScope("my_tasks");
                            }}
                        >
                            <Ionicons
                                name="person"
                                size={14}
                                color={viewScope === "my_tasks" ? COLORS.primaryText : COLORS.textSecondary}
                            />
                            <Text style={[styles.scopeText, viewScope === "my_tasks" && styles.scopeTextActive]}>
                                My Tasks
                            </Text>
                            {myOrders.length > 0 && (
                                <View style={styles.scopeCountBadge}>
                                    <Text style={styles.scopeCountText}>{myOrders.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.scopeButton, viewScope === "store_wide" && styles.scopeButtonActive]}
                            onPress={() => {
                                setViewScope("store_wide");
                            }}
                        >
                            <Ionicons
                                name="business"
                                size={14}
                                color={viewScope === "store_wide" ? COLORS.primaryText : COLORS.textSecondary}
                            />
                            <Text style={[styles.scopeText, viewScope === "store_wide" && styles.scopeTextActive]}>
                                Store-Wide
                            </Text>
                            <View style={[styles.scopeCountBadge, { backgroundColor: COLORS.inactiveBg }]}>
                                <Text style={[styles.scopeCountText, { color: COLORS.textPrimary }]}>
                                    {liveOrders.length}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.metricsRow}>
                        <TouchableOpacity
                            style={[styles.metricCard, activeTab === "orders" && styles.metricCardActive]}
                            onPress={() => {
                                if (activeTab === "orders") {
                                    router.push({
                                        pathname: "/(app)/(tabs)/home/actions/sales_floor/Orders",
                                        params: { from: "dashboard" },
                                    });
                                } else {
                                    setActiveTab("orders");
                                }
                            }}
                        >
                            <View style={styles.metricIconRow}>
                                <Ionicons name="cart" size={20} color={COLORS.primary} />
                                <Text style={styles.metricValue}>{displayedOrders.length}</Text>
                            </View>
                            <View style={styles.metricLabelRow}>
                                <Text style={styles.metricLabel}>
                                    {viewScope === "my_tasks" ? "My Orders" : "Live Orders"}
                                </Text>
                                <Ionicons name="chevron-forward" size={12} color={COLORS.textSecondary} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.metricCard, activeTab === "cycle_counts" && styles.metricCardActive]}
                            onPress={() => {
                                if (activeTab === "cycle_counts") {
                                    router.push({
                                        pathname: "/(app)/(tabs)/home/actions/back_room/CycleCount",
                                        params: { from: "dashboard" },
                                    });
                                } else {
                                    setActiveTab("cycle_counts");
                                }
                            }}
                        >
                            <View style={styles.metricIconRow}>
                                <Ionicons name="barcode" size={20} color={COLORS.accent} />
                                <Text style={styles.metricValue}>{displayedCycleCounts.length}</Text>
                            </View>
                            <View style={styles.metricLabelRow}>
                                <Text style={styles.metricLabel}>Cycle Counts</Text>
                                <Ionicons name="chevron-forward" size={12} color={COLORS.textSecondary} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.metricCard, activeTab === "activities" && styles.metricCardActive]}
                            onPress={() => {
                                if (activeTab === "activities") {
                                    router.push("/(app)/(tabs)/home/actions");
                                } else {
                                    setActiveTab("activities");
                                }
                            }}
                        >
                            <View style={styles.metricIconRow}>
                                <Ionicons name="pulse" size={20} color={COLORS.success} />
                                <Text style={styles.metricValue}>{displayedActivities.length}</Text>
                            </View>
                            <View style={styles.metricLabelRow}>
                                <Text style={styles.metricLabel}>Activities</Text>
                                <Ionicons name="chevron-forward" size={12} color={COLORS.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tabsContainer}>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === "overview" && styles.tabButtonActive]}
                            onPress={() => setActiveTab("overview")}
                        >
                            <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>
                                Overview
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === "orders" && styles.tabButtonActive]}
                            onPress={() => setActiveTab("orders")}
                        >
                            <Text style={[styles.tabText, activeTab === "orders" && styles.tabTextActive]}>
                                Live Orders ({displayedOrders.length})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === "cycle_counts" && styles.tabButtonActive]}
                            onPress={() => setActiveTab("cycle_counts")}
                        >
                            <Text style={[styles.tabText, activeTab === "cycle_counts" && styles.tabTextActive]}>
                                Cycle Counts ({displayedCycleCounts.length})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === "activities" && styles.tabButtonActive]}
                            onPress={() => setActiveTab("activities")}
                        >
                            <Text style={[styles.tabText, activeTab === "activities" && styles.tabTextActive]}>
                                Feed
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {initialLoading ? (
                        <View style={styles.loadingContainer}>
                            <LoadingSpinner />
                            <Text style={styles.loadingText}>Connecting to store data feeds...</Text>
                        </View>
                    ) : (
                        <>
                            {(activeTab === "overview" || activeTab === "orders") && (
                                <View style={styles.sectionContainer}>
                                    <View style={styles.sectionHeader}>
                                        <View style={styles.sectionTitleRow}>
                                            <Ionicons name="cart-outline" size={18} color={COLORS.textPrimary} />
                                            <Text style={styles.sectionHeading}>
                                                {viewScope === "my_tasks" ? "My Assigned Orders" : "Store Actionable Orders"}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.headerActionBtn}
                                            onPress={() =>
                                                router.push({
                                                    pathname: "/(app)/(tabs)/home/actions/sales_floor/Orders",
                                                    params: { from: "dashboard" },
                                                })
                                            }
                                        >
                                            <Text style={styles.headerActionText}>View Orders →</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {displayedOrders.length === 0 ? (
                                        <View style={styles.emptyCard}>
                                            <Ionicons
                                                name={viewScope === "my_tasks" ? "person-outline" : "cloud-download-outline"}
                                                size={32}
                                                color={COLORS.textSecondary}
                                            />
                                            <Text style={styles.emptyCardText}>
                                                {viewScope === "my_tasks"
                                                    ? "No orders assigned to you yet."
                                                    : "No unpicked BOPIS or shipped STS orders found."}
                                            </Text>
                                            {viewScope === "my_tasks" && liveOrders.length > 0 && (
                                                <TouchableOpacity
                                                    style={styles.emptyCardAction}
                                                    onPress={() => setViewScope("store_wide")}
                                                >
                                                    <Text style={styles.emptyCardActionText}>
                                                        View {liveOrders.length} Store Orders to Claim →
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ) : (
                                        displayedOrders.slice(0, activeTab === "overview" ? 4 : 25).map((order) => (
                                            <OrderCard
                                                key={`order-${order.order_id}`}
                                                order={order}
                                                isNew={newOrderIds.has(order.order_id)}
                                                isAdmin={isAdmin}
                                                onPress={() => handleOrderPress(order)}
                                                style={styles.cardSpacing}
                                            />
                                        ))
                                    )}
                                </View>
                            )}

                            {(activeTab === "overview" || activeTab === "cycle_counts") && (
                                <View style={styles.sectionContainer}>
                                    <View style={styles.sectionHeader}>
                                        <View style={styles.sectionTitleRow}>
                                            <Ionicons name="barcode-outline" size={18} color={COLORS.textPrimary} />
                                            <Text style={styles.sectionHeading}>
                                                {viewScope === "my_tasks" ? "My In-Progress Cycle Counts" : "In-Progress Cycle Counts"}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.headerActionBtn}
                                            onPress={() =>
                                                router.push({
                                                    pathname: "/(app)/(tabs)/home/actions/back_room/CycleCount",
                                                    params: { from: "dashboard" },
                                                })
                                            }
                                        >
                                            <Text style={styles.headerActionText}>View All →</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {displayedCycleCounts.length === 0 ? (
                                        <View style={styles.emptyCard}>
                                            <Ionicons name="checkmark-done-circle-outline" size={32} color={COLORS.textSecondary} />
                                            <Text style={styles.emptyCardText}>No cycle counts in progress</Text>
                                        </View>
                                    ) : (
                                        displayedCycleCounts.slice(0, activeTab === "overview" ? 3 : 20).map((count) => {
                                            const progress = count.total_items > 0 ? count.counted_items / count.total_items : 0;
                                            return (
                                                <TouchableOpacity
                                                    key={`cycle-${count.count_id}`}
                                                    activeOpacity={0.7}
                                                    onPress={() => handleCycleCountPress(count)}
                                                    style={[globalStyles.card, styles.cycleCountCard]}
                                                >
                                                    <View style={styles.cycleCardHeader}>
                                                        <View style={styles.cycleInfoColumn}>
                                                            <Text style={styles.cycleCategory}>{count.category_name}</Text>
                                                            <Text style={styles.cycleSubtext}>
                                                                Count #{count.count_id} • Action: {count.action}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.cycleBadgeRow}>
                                                            <View style={styles.cycleBadge}>
                                                                <Text style={styles.cycleBadgeText}>{count.status}</Text>
                                                            </View>
                                                            <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                                                        </View>
                                                    </View>

                                                    <View style={styles.progressBarBackground}>
                                                        <View
                                                            style={[
                                                                styles.progressBarFill,
                                                                { width: `${Math.min(100, Math.round(progress * 100))}%` },
                                                            ]}
                                                        />
                                                    </View>

                                                    <View style={styles.cycleStatsRow}>
                                                        <Text style={styles.cycleStatLabel}>
                                                            Counted:{" "}
                                                            <Text style={styles.cycleStatBold}>
                                                                {count.counted_items} / {count.total_items}
                                                            </Text>{" "}
                                                            ({Math.round(progress * 100)}%)
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.cycleStatLabel,
                                                                count.total_variance_cost < 0
                                                                    ? styles.varianceNeg
                                                                    : styles.variancePos,
                                                            ]}
                                                        >
                                                            Variance: {formatMoney(count.total_variance_cost)}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })
                                    )}
                                </View>
                            )}

                            {(activeTab === "overview" || activeTab === "activities") && (
                                <View style={styles.sectionContainer}>
                                    <View style={styles.sectionHeader}>
                                        <View style={styles.sectionTitleRow}>
                                            <Ionicons name="flash-outline" size={18} color={COLORS.textPrimary} />
                                            <Text style={styles.sectionHeading}>
                                                {viewScope === "my_tasks" ? "My Activity Stream" : "Store Activity Stream"}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.headerActionBtn}
                                            onPress={() => router.push("/(app)/(tabs)/home/actions")}
                                        >
                                            <Text style={styles.headerActionText}>Actions →</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {displayedActivities.length === 0 ? (
                                        <View style={styles.emptyCard}>
                                            <Ionicons name="pulse-outline" size={32} color={COLORS.textSecondary} />
                                            <Text style={styles.emptyCardText}>No activity recorded yet</Text>
                                        </View>
                                    ) : (
                                        displayedActivities.slice(0, activeTab === "overview" ? 4 : 30).map((act, index) => (
                                            <TouchableOpacity
                                                key={`${act.activity_id}-${index}`}
                                                activeOpacity={0.7}
                                                onPress={() => handleActivityPress(act)}
                                                style={[globalStyles.card, styles.activityCard]}
                                            >
                                                <View style={styles.activityIconCircle}>
                                                    <Ionicons
                                                        name={
                                                            act.activity_type.includes("TIMEOUT") || act.activity_type.includes("CANCEL")
                                                                ? "time-outline"
                                                                : act.activity_type.includes("ORDER")
                                                                    ? "cart"
                                                                    : act.activity_type.includes("CYCLE")
                                                                        ? "barcode"
                                                                        : act.activity_type.includes("RECEIVING") || act.activity_type.includes("PO")
                                                                            ? "cube"
                                                                            : "notifications-outline"
                                                        }
                                                        size={16}
                                                        color={COLORS.primary}
                                                    />
                                                </View>
                                                <View style={styles.activityContent}>
                                                    <View style={styles.activityHeaderRow}>
                                                        <Text style={styles.activityTitle}>{act.title}</Text>
                                                        <View style={styles.activityTimeGroup}>
                                                            <Text style={styles.activityTime}>
                                                                {new Date(act.timestamp).toLocaleTimeString([], {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                })}
                                                            </Text>
                                                            <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
                                                        </View>
                                                    </View>
                                                    <Text style={styles.activityDescription}>{act.description}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            )}
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: SPACING.huge,
    },
    toastBanner: {
        position: "absolute",
        top: 60,
        left: 16,
        right: 16,
        zIndex: 999,
        backgroundColor: COLORS.successDark,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.smd,
        paddingHorizontal: SPACING.mdl,
        borderRadius: RADIUS.md,
        gap: SPACING.sm,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 6,
    },
    toastText: {
        color: COLORS.surface,
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        flex: 1,
    },
    dashboardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.smd,
    },
    titleColumn: {
        flex: 1,
    },
    statusColumn: {
        marginLeft: SPACING.smd,
    },
    welcomeText: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    headerTitle: {
        fontSize: FONT_SIZE.xxxl,
        fontWeight: "800",
        color: COLORS.textPrimary,
        marginTop: SPACING.xxs,
    },
    scopeSwitcherContainer: {
        flexDirection: "row",
        paddingHorizontal: SPACING.lg,
        gap: SPACING.smd,
        marginBottom: SPACING.md,
    },
    scopeButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.mdl,
        paddingVertical: 9,
        paddingHorizontal: SPACING.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        gap: SPACING.xsm,
    },
    scopeButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    scopeText: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "700",
        color: COLORS.textSecondary,
    },
    scopeTextActive: {
        color: COLORS.primaryText,
    },
    scopeCountBadge: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.xsm,
        paddingVertical: SPACING.hairline,
        borderRadius: RADIUS.mdl,
    },
    scopeCountText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "800",
        color: COLORS.primary,
    },
    metricsRow: {
        flexDirection: "row",
        paddingHorizontal: SPACING.lg,
        gap: SPACING.smd,
        marginBottom: SPACING.mdl,
    },
    metricCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    metricCardActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primarySurfaceTint,
    },
    metricIconRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.xs,
    },
    metricValue: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: "800",
        color: COLORS.textPrimary,
    },
    metricLabelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    metricLabel: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    tabsContainer: {
        flexDirection: "row",
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    tabButton: {
        paddingVertical: 7,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.xxl,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tabButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tabText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: COLORS.primaryText,
    },
    loadingContainer: {
        paddingVertical: SPACING.huge,
        alignItems: "center",
        gap: SPACING.md,
    },
    loadingText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
    },
    sectionContainer: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.xl,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.smd,
    },
    sectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xsm,
    },
    sectionHeading: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    headerActionBtn: {
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
    },
    headerActionText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
        color: COLORS.primary,
    },
    cardSpacing: {
        marginBottom: SPACING.smd,
    },
    emptyCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.xxl,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.sm,
    },
    emptyCardText: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        fontWeight: "500",
        textAlign: "center",
    },
    emptyCardAction: {
        marginTop: SPACING.xsm,
        paddingVertical: SPACING.xsm,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.primarySurfaceTint,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    emptyCardActionText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
        color: COLORS.primary,
    },
    cycleCountCard: {
        marginBottom: SPACING.smd,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.accent,
    },
    cycleCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: SPACING.smd,
    },
    cycleInfoColumn: {
        flex: 1,
    },
    cycleCategory: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    cycleSubtext: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    cycleBadgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xsm,
    },
    cycleBadge: {
        backgroundColor: COLORS.infoBg,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.micro,
        borderRadius: RADIUS.sm,
    },
    cycleBadgeText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "700",
        color: COLORS.info,
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: COLORS.inputBorder,
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: SPACING.sm,
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: COLORS.accent,
        borderRadius: 3,
    },
    cycleStatsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    cycleStatLabel: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    cycleStatBold: {
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    varianceNeg: {
        color: COLORS.danger,
        fontWeight: "600",
    },
    variancePos: {
        color: COLORS.success,
        fontWeight: "600",
    },
    activityCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.success,
        gap: SPACING.md,
    },
    activityIconCircle: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.activeBg,
        alignItems: "center",
        justifyContent: "center",
    },
    activityContent: {
        flex: 1,
    },
    activityHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.xxs,
    },
    activityTitle: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    activityTimeGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
    },
    activityTime: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
    },
    activityDescription: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    networkStatsRow: {
        flexDirection: "row",
        gap: SPACING.sm,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.smd,
        marginBottom: SPACING.mdl,
    },
    networkStatCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.mdl,
        padding: SPACING.smd,
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    networkStatIconCircle: {
        width: 28,
        height: 28,
        borderRadius: RADIUS.lgPlus,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: SPACING.xsm,
    },
    networkStatValue: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "800",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xxs,
    },
    networkStatLabel: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: "600",
        color: COLORS.textSecondary,
        textAlign: "center",
    },
    hubInstructionBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.indigoBg,
        borderRadius: RADIUS.md,
        padding: SPACING.smd,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        gap: SPACING.sm,
    },
    hubInstructionText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.indigo,
        flex: 1,
        lineHeight: 16,
    },
    storeListContainer: {
        paddingHorizontal: SPACING.lg,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    sectionSubtext: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    storeSelectedBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.primarySurface,
        borderWidth: 1,
        borderColor: COLORS.dangerBorderLight,
        borderRadius: RADIUS.mdl,
        padding: SPACING.md,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.smd,
        marginBottom: SPACING.mdl,
    },
    storeSelectedInfo: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    storeSelectedTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xsm,
    },
    storeSelectedName: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    storeSelectedSub: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    hqBadge: {
        backgroundColor: COLORS.violetBg,
        paddingHorizontal: SPACING.xsm,
        paddingVertical: SPACING.hairline,
        borderRadius: RADIUS.xs,
    },
    hqText: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: "700",
        color: COLORS.violet,
    },
    allStoresButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.primary,
        paddingHorizontal: SPACING.smd,
        paddingVertical: SPACING.xsm,
        borderRadius: RADIUS.md,
        gap: SPACING.xs,
    },
    allStoresButtonText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
        color: COLORS.primary,
    },
});
