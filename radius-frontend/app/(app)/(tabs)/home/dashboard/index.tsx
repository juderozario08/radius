import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
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
import { globalStyles } from "@/constants/styles";
import { dashboardStyles as styles } from "@/components/dashboard/dashboardStyles";
import { DashboardActivityCard, DashboardCycleCountCard } from "@/components/dashboard/DashboardFeedCards";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getCancelledDashboardOrders, getDashboardCycleCounts, getDashboardOrders, getDashboardPurchaseOrders, getDashboardStoreOperations } from "@/api/dashboard.api";
import { assignOnlineOrder } from "@/api/onlineOrders.api";
import {
    OrderCreatedPayload,
    CycleCountUpdatedPayload,
    StoreActivityPayload,
} from "@/types/websocket.types";
import { StoreOperationsCard } from "@/components/store/StoreOperationsCard";
import { StoreOperationSummary } from "@/types/admin.types";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatMoney } from "@/utils/money";
import { filterDashboardActivities, filterDashboardCycleCounts, mergeDashboardActivities } from "@/utils/dashboardActivities";

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
        const res = await getDashboardStoreOperations(logout);
        if (res && Array.isArray(res)) {
            setStoreOperations(res);
        }
        setLoadingStores(false);
    }, [isAdmin, logout]);

    const [liveOrders, setLiveOrders] = useState<OrderCreatedPayload[]>([]);
    const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
    const [liveCycleCounts, setLiveCycleCounts] = useState<CycleCountUpdatedPayload[]>([]);
    const [liveActivities, setLiveActivities] = useState<StoreActivityPayload[]>([]);
    const websocketActivityIds = useRef(new Set<string>());

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
                websocketActivityIds.current.add(newAct.activity_id);
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
                websocketActivityIds.current.add(newAct.activity_id);
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
                    metadata: { count_id: payload.count_id, counted_by: payload.counted_by },
                };
                websocketActivityIds.current.add(newAct.activity_id);
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
            websocketActivityIds.current.add(payload.activity_id);
            setLiveActivities((prev) => [payload, ...prev.filter((a) => a.activity_id !== payload.activity_id)]);
            showToast(`🔔 Store Activity: ${payload.title}`);
        },
    });

    const loadInitialData = useCallback(async (storeIdOverride?: number) => {
        const activities: StoreActivityPayload[] = [];
        const effectiveStoreId = storeIdOverride !== undefined
            ? storeIdOverride
            : (isAdmin && selectedStore ? selectedStore.store_id : user?.store_id);
        const ordersRes = await getDashboardOrders(effectiveStoreId, logout);
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

        const cancelRes = await getCancelledDashboardOrders(effectiveStoreId, logout);
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

        const countsRes = await getDashboardCycleCounts(effectiveStoreId, logout);
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
                    metadata: { count_id: c.count_id, counted_by: c.counted_by },
                });
            }
        }

        const posRes = await getDashboardPurchaseOrders(effectiveStoreId, logout);
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
        setLiveActivities((previous) => mergeDashboardActivities(uniqueActivities, previous, websocketActivityIds.current, effectiveStoreId));

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

        if (!order.assigned_to && currentEmpId) {
            const empName = user?.last_name ? `Associate ${user.last_name}` : "You";
            showToast(`⚡ Claiming Order #${order.order_id} for you...`);

            setLiveOrders((prev) =>
                prev.map((o) =>
                    o.order_id === order.order_id
                        ? { ...o, assigned_to: currentEmpId, assigned_to_name: empName }
                        : o
                )
            );

            const claimed = await assignOnlineOrder(order.order_id, currentEmpId, logout);
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

    const displayedCycleCounts = useMemo(
        () => filterDashboardCycleCounts(liveCycleCounts, viewScope === "my_tasks", currentEmpId),
        [viewScope, liveCycleCounts, currentEmpId]
    );

    const displayedActivities = useMemo(
        () => filterDashboardActivities(liveActivities, viewScope === "my_tasks", currentEmpId),
        [viewScope, liveActivities, currentEmpId]
    );

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
                                        displayedCycleCounts.slice(0, activeTab === "overview" ? 3 : 20).map((count) => (
                                            <DashboardCycleCountCard key={`cycle-${count.count_id}`} count={count} onPress={() => handleCycleCountPress(count)} />
                                        ))
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
                                        displayedActivities.slice(0, activeTab === "overview" ? 4 : 30).map((act) => (
                                            <DashboardActivityCard key={act.activity_id} activity={act} onPress={() => handleActivityPress(act)} />
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
