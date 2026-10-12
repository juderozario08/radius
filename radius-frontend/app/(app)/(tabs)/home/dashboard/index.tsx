import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    FlatList,
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
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import { DashboardActivityCard, DashboardCycleCountCard } from "@/components/dashboard/DashboardFeedCards";
import { AdminNetworkStats, DashboardSection, SelectedStoreBanner } from "@/components/dashboard/DashboardPanels";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
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
import {
    activityRoute,
    applyCycleCountUpdate,
    applyOrderStatusUpdate,
    buildSnapshotActivities,
    countToPayload,
    cycleCountActivity,
    isDashboardEligibleOrder,
    isInProgressCount,
    isLiveStoreActivity,
    orderCreatedActivity,
    orderDetailRoute,
    orderStatusActivity,
    orderToPayload,
} from "@/utils/dashboardFeed";

type TabView = "overview" | "orders" | "cycle_counts" | "activities";
type ScopeView = "my_tasks" | "store_wide";

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

    const { toastMessage, toastOpacity, showToast } = useToast();

    const pushLiveActivity = useCallback((activity: StoreActivityPayload) => {
        websocketActivityIds.current.add(activity.activity_id);
        setLiveActivities((prev) => [activity, ...prev.filter((a) => a.activity_id !== activity.activity_id)]);
    }, []);

    const refreshNetworkIfBrowsing = () => {
        if (isAdmin && !selectedStore) {
            loadStoreOperations();
        }
    };

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
            refreshNetworkIfBrowsing();
            if (!isDashboardEligibleOrder(payload)) {
                return;
            }
            setLiveOrders((prev) => (prev.some((o) => o.order_id === payload.order_id) ? prev : [payload, ...prev]));
            setNewOrderIds((prev) => new Set(prev).add(payload.order_id));
            showToast(`⚡ Live Order #${payload.order_id} Received (${payload.order_type} - ${formatMoney(payload.total_amount)})`);
            pushLiveActivity(orderCreatedActivity(payload));
        },
        onOrderStatusUpdated: (payload) => {
            refreshNetworkIfBrowsing();
            setLiveOrders((prev) => applyOrderStatusUpdate(prev, payload));
            showToast(payload.assigned_to_name
                ? `👤 Order #${payload.order_id} assigned to ${payload.assigned_to_name}`
                : `🔄 Order #${payload.order_id} status changed to ${payload.new_status}`);
            pushLiveActivity(orderStatusActivity(payload));
        },
        onCycleCountUpdated: (payload) => {
            refreshNetworkIfBrowsing();
            setLiveCycleCounts((prev) => applyCycleCountUpdate(prev, payload));
            if (isInProgressCount(payload.status)) {
                showToast(`📊 Cycle Count #${payload.count_id} Updated: ${payload.category_name} (${payload.action})`);
            }
            pushLiveActivity(cycleCountActivity(payload));
        },
        onStoreActivity: (payload) => {
            refreshNetworkIfBrowsing();
            if (!isLiveStoreActivity(payload)) {
                return;
            }
            pushLiveActivity(payload);
            showToast(`🔔 Store Activity: ${payload.title}`);
        },
    });

    const loadInitialData = useCallback(async (storeIdOverride?: number) => {
        const effectiveStoreId = storeIdOverride !== undefined
            ? storeIdOverride
            : (isAdmin && selectedStore ? selectedStore.store_id : user?.store_id);

        const ordersRes = await getDashboardOrders(effectiveStoreId, logout);
        const orders = Array.isArray(ordersRes?.online_orders) ? ordersRes.online_orders : undefined;
        if (orders) {
            setLiveOrders(orders.filter(isDashboardEligibleOrder).map(orderToPayload));
        }

        const cancelRes = await getCancelledDashboardOrders(effectiveStoreId, logout);
        const cancelledOrders = Array.isArray(cancelRes?.online_orders) ? cancelRes.online_orders : undefined;

        const countsRes = await getDashboardCycleCounts(effectiveStoreId, logout);
        const counts = Array.isArray(countsRes) ? countsRes : undefined;
        if (counts) {
            setLiveCycleCounts(counts.filter((c) => isInProgressCount(c.status)).slice(0, 10).map(countToPayload));
        }

        const posRes = await getDashboardPurchaseOrders(effectiveStoreId, logout);
        const purchaseOrders = Array.isArray(posRes) ? posRes : undefined;

        const snapshot = buildSnapshotActivities({ orders, cancelledOrders, counts, purchaseOrders });
        setLiveActivities((previous) => mergeDashboardActivities(snapshot, previous, websocketActivityIds.current, effectiveStoreId));

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

    const handleConnectionPress = () => {
        if (!isConnected) {
            reconnect();
            showToast("Reconnecting to WebSocket server...");
        } else {
            sendPing();
            showToast("Ping heartbeat sent to backend!");
        }
    };

    const handleOrderPress = async (order: OrderCreatedPayload) => {
        const currentEmpId = user?.employee_id;
        const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";

        if (isAdmin) {
            router.push(orderDetailRoute(order.order_id));
            return;
        }

        if (order.assigned_to && order.assigned_to !== currentEmpId) {
            const assignee = order.assigned_to_name || "another associate";
            if (!isManagerOrAdmin) {
                showToast(`⚠️ Order #${order.order_id} is currently being worked on by ${assignee}!`);
                return;
            }
            showToast(`ℹ️ Order #${order.order_id} is currently assigned to ${assignee}.`);
            router.push(orderDetailRoute(order.order_id));
            return;
        }

        if (!order.assigned_to && currentEmpId) {
            const empName = user?.last_name ? `Associate ${user.last_name}` : "You";
            showToast(`⚡ Claiming Order #${order.order_id} for you...`);

            const setAssignee = (assignedTo: number | null | undefined, assignedToName: string | null | undefined) =>
                setLiveOrders((prev) =>
                    prev.map((o) => (o.order_id === order.order_id ? { ...o, assigned_to: assignedTo, assigned_to_name: assignedToName } : o))
                );

            setAssignee(currentEmpId, empName);
            const claimed = await assignOnlineOrder(order.order_id, currentEmpId, logout);
            if (claimed === null) {
                setAssignee(order.assigned_to, order.assigned_to_name);
                return;
            }
        }

        router.push(orderDetailRoute(order.order_id));
    };

    const handleCycleCountPress = (count: CycleCountUpdatedPayload) => {
        router.push({
            pathname: "/(app)/(tabs)/home/actions/back_room/CycleCountDetail",
            params: { id: count.count_id, from: "dashboard" },
        });
    };

    const openOrders = () => router.push({ pathname: "/(app)/(tabs)/home/actions/sales_floor/Orders", params: { from: "dashboard" } });
    const openCycleCounts = () => router.push({ pathname: "/(app)/(tabs)/home/actions/back_room/CycleCount", params: { from: "dashboard" } });
    const openActions = () => router.push("/(app)/(tabs)/home/actions");

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

    const isMyTasks = viewScope === "my_tasks";

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
                                    <ConnectionStatusBadge status={connectionStatus} onPress={handleConnectionPress} />
                                </View>
                            </View>

                            <AdminNetworkStats stores={storeOperations} />

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
                            <StoreOperationsCard store={store} onSelect={setSelectedStore} />
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
                        <SelectedStoreBanner store={selectedStore} onBack={() => setSelectedStore(null)} />
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
                            <ConnectionStatusBadge status={connectionStatus} onPress={handleConnectionPress} />
                        </View>
                    </View>

                    <DashboardControls
                        scope={viewScope}
                        tab={activeTab}
                        myOrderCount={myOrders.length}
                        storeOrderCount={liveOrders.length}
                        orderCount={displayedOrders.length}
                        cycleCount={displayedCycleCounts.length}
                        activityCount={displayedActivities.length}
                        onScopeChange={setViewScope}
                        onTabChange={setActiveTab}
                        onOpenOrders={openOrders}
                        onOpenCycleCounts={openCycleCounts}
                        onOpenActivities={openActions}
                    />

                    {initialLoading ? (
                        <View style={styles.loadingContainer}>
                            <LoadingSpinner />
                            <Text style={styles.loadingText}>Connecting to store data feeds...</Text>
                        </View>
                    ) : (
                        <>
                            {(activeTab === "overview" || activeTab === "orders") && (
                                <DashboardSection
                                    icon="cart-outline"
                                    title={isMyTasks ? "My Assigned Orders" : "Store Actionable Orders"}
                                    actionLabel="View Orders →"
                                    onAction={openOrders}
                                    isEmpty={displayedOrders.length === 0}
                                    emptyIcon={isMyTasks ? "person-outline" : "cloud-download-outline"}
                                    emptyText={isMyTasks ? "No orders assigned to you yet." : "No unpicked BOPIS or shipped STS orders found."}
                                    emptyAction={isMyTasks && liveOrders.length > 0
                                        ? { label: `View ${liveOrders.length} Store Orders to Claim →`, onPress: () => setViewScope("store_wide") }
                                        : undefined}
                                >
                                    {displayedOrders.slice(0, activeTab === "overview" ? 4 : 25).map((order) => (
                                        <OrderCard
                                            key={`order-${order.order_id}`}
                                            order={order}
                                            isNew={newOrderIds.has(order.order_id)}
                                            isAdmin={isAdmin}
                                            onPress={() => handleOrderPress(order)}
                                            style={styles.cardSpacing}
                                        />
                                    ))}
                                </DashboardSection>
                            )}

                            {(activeTab === "overview" || activeTab === "cycle_counts") && (
                                <DashboardSection
                                    icon="barcode-outline"
                                    title={isMyTasks ? "My In-Progress Cycle Counts" : "In-Progress Cycle Counts"}
                                    actionLabel="View All →"
                                    onAction={openCycleCounts}
                                    isEmpty={displayedCycleCounts.length === 0}
                                    emptyIcon="checkmark-done-circle-outline"
                                    emptyText="No cycle counts in progress"
                                >
                                    {displayedCycleCounts.slice(0, activeTab === "overview" ? 3 : 20).map((count) => (
                                        <DashboardCycleCountCard key={`cycle-${count.count_id}`} count={count} onPress={() => handleCycleCountPress(count)} />
                                    ))}
                                </DashboardSection>
                            )}

                            {(activeTab === "overview" || activeTab === "activities") && (
                                <DashboardSection
                                    icon="flash-outline"
                                    title={isMyTasks ? "My Activity Stream" : "Store Activity Stream"}
                                    actionLabel="Actions →"
                                    onAction={openActions}
                                    isEmpty={displayedActivities.length === 0}
                                    emptyIcon="pulse-outline"
                                    emptyText="No activity recorded yet"
                                >
                                    {displayedActivities.slice(0, activeTab === "overview" ? 4 : 30).map((act) => (
                                        <DashboardActivityCard key={act.activity_id} activity={act} onPress={() => router.push(activityRoute(act))} />
                                    ))}
                                </DashboardSection>
                            )}
                        </>
                    )}
                </ScrollView>
            )}
        </TopSafeAreaView>
    );
}
