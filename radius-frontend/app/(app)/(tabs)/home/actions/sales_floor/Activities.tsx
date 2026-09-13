import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Animated, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { TopSafeAreaView } from '@/components/common/TopSafeAreaView';
import HeaderComponent from '@/components/common/HeaderComponent';
import BackButton from '@/components/common/BackButton';
import { globalStyles } from '@/constants/styles';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { callApi } from '@/utils/helpers';
import { ENDPOINTS } from '@/constants/routes';
import {
    OrderCreatedPayload,
    CycleCountUpdatedPayload,
    StoreActivityPayload,
} from '@/types/websocket.types';
import { GetAllOnlineOrdersResponse } from '@/types/order.types';
import { CycleCountSummary } from '@/types/cyclecount.types';
import { PurchaseOrderSummary } from '@/types/receiving.types';

const Tab = createMaterialTopTabNavigator();

export default function Activities() {
    const { user, logout } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    // For admin, we might need a selected store. Since this is an actions screen, it might only be accessible when a store is selected, or we default to user's store_id.
    const activeStoreId = user?.store_id ?? 2;
    const currentEmpId = user?.employee_id;

    const [liveOrders, setLiveOrders] = useState<OrderCreatedPayload[]>([]);
    const [liveCycleCounts, setLiveCycleCounts] = useState<CycleCountUpdatedPayload[]>([]);
    const [liveActivities, setLiveActivities] = useState<StoreActivityPayload[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const toastOpacity = useRef(new Animated.Value(0)).current;

    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        Animated.sequence([
            Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.delay(3500),
            Animated.timing(toastOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]).start(() => setToastMessage(null));
    }, [toastOpacity]);

    useWebSocket({
        storeId: activeStoreId,
        autoConnect: true,
        maxHistorySize: 100,
        onOrderCreated: (payload) => {
            setLiveOrders((prev) => {
                if (prev.some((o) => o.order_id === payload.order_id)) return prev;
                return [payload, ...prev];
            });
            showToast(`⚡ New Order #${payload.order_id} Received`);
            setLiveActivities((prev) => [{
                activity_id: `act-order-${payload.order_id}-${Date.now()}`,
                store_id: payload.store_id,
                activity_type: "ORDER_PLACED",
                title: `New Online Order #${payload.order_id}`,
                description: `${payload.customer_name} placed ${payload.order_type} order`,
                timestamp: payload.placed_at || new Date().toISOString(),
                metadata: { order_id: payload.order_id, assigned_to: payload.assigned_to },
            }, ...prev]);
        },
        onOrderStatusUpdated: (payload) => {
            setLiveOrders((prev) => {
                const exists = prev.some((o) => o.order_id === payload.order_id);
                if (exists) {
                    return prev.map((o) => o.order_id === payload.order_id ? {
                        ...o,
                        status: payload.new_status,
                        assigned_to: payload.assigned_to !== undefined ? payload.assigned_to : o.assigned_to,
                        assigned_to_name: payload.assigned_to_name !== undefined ? payload.assigned_to_name : o.assigned_to_name,
                    } : o);
                }
                return [{
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
                }, ...prev];
            });

            setLiveActivities((prev) => [{
                activity_id: `act-status-${payload.order_id}-${Date.now()}`,
                store_id: payload.store_id,
                activity_type: "ORDER_STATUS_CHANGED",
                title: `Order #${payload.order_id} Updated`,
                description: payload.assigned_to_name ? `Assigned to ${payload.assigned_to_name}` : `Moved to ${payload.new_status}`,
                timestamp: payload.updated_at || new Date().toISOString(),
                metadata: { order_id: payload.order_id, assigned_to: payload.assigned_to },
            }, ...prev]);
        },
        onCycleCountUpdated: (payload) => {
            setLiveCycleCounts((prev) => {
                const index = prev.findIndex((c) => c.count_id === payload.count_id);
                if (index >= 0) {
                    const updated = [...prev];
                    updated[index] = payload;
                    return updated;
                }
                return [payload, ...prev];
            });
            setLiveActivities((prev) => [{
                activity_id: `act-cycle-${payload.count_id}-${Date.now()}`,
                store_id: payload.store_id,
                activity_type: "CYCLE_COUNT_UPDATED",
                title: `Cycle Count #${payload.count_id} - ${payload.category_name}`,
                description: `Status: ${payload.status} • Action: ${payload.action}`,
                timestamp: payload.updated_at || new Date().toISOString(),
                metadata: { count_id: payload.count_id },
            }, ...prev]);
        },
        onStoreActivity: (payload) => {
            if (payload.activity_type.includes("POS") || payload.activity_type.includes("TRANSACTION") || payload.activity_type.includes("FILL") || payload.activity_type.includes("STOCK")) {
                return;
            }
            setLiveActivities((prev) => [payload, ...prev]);
        },
    });

    const loadInitialData = useCallback(async () => {
        const activities: StoreActivityPayload[] = [];
        const storeParam = activeStoreId ? `&store_id=${activeStoreId}` : "";
        const storeQueryOnly = activeStoreId ? `?store_id=${activeStoreId}` : "";

        try {
            // 1. Active Orders
            const activeRes = await callApi<GetAllOnlineOrdersResponse>(
                `${ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.getAll}?page=1&page_size=40&dashboard_only=true${storeParam}`,
                { method: "GET" }, logout
            );
            // 2. Completed Orders (Released)
            const releasedRes = await callApi<GetAllOnlineOrdersResponse>(
                `${ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.getAll}?page=1&page_size=20&status=RELEASED${storeParam}`,
                { method: "GET" }, logout
            );
            // 3. Completed Orders (Cancelled)
            const cancelledRes = await callApi<GetAllOnlineOrdersResponse>(
                `${ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.getAll}?page=1&page_size=10&status=CANCELLED${storeParam}`,
                { method: "GET" }, logout
            );

            const allFetchedOrders = [
                ...(activeRes?.online_orders || []),
                ...(releasedRes?.online_orders || []),
                ...(cancelledRes?.online_orders || []),
            ];

            const mappedOrders = allFetchedOrders.map(o => ({
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
            setLiveOrders(mappedOrders);

            mappedOrders.forEach(o => {
                activities.push({
                    activity_id: `act-order-${o.order_id}-${o.status}`,
                    store_id: o.store_id,
                    activity_type: "ORDER_PLACED",
                    title: `${o.order_type} Order #${o.order_id}`,
                    description: `${o.customer_name} • Status: ${o.status}${o.assigned_to_name ? ` • Assigned to ${o.assigned_to_name}` : ""}`,
                    timestamp: o.placed_at,
                    metadata: { order_id: o.order_id, assigned_to: o.assigned_to },
                });
            });
        } catch {}

        try {
            const countsRes = await callApi<CycleCountSummary[]>(
                `${ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.getWeekly}${storeQueryOnly}`,
                { method: "GET" }, logout
            );
            if (countsRes && Array.isArray(countsRes)) {
                setLiveCycleCounts(countsRes.map(c => ({
                    count_id: c.count_id,
                    store_id: c.store_id,
                    category_id: c.category_id,
                    category_name: c.category_name,
                    status: c.status || "",
                    action: "scanned",
                    total_items: c.total_items,
                    counted_items: c.counted_items,
                    total_variance_cost: Number(c.total_variance_cost) || 0,
                    updated_at: c.count_date || new Date().toISOString(),
                    counted_by: (c as any).counted_by,
                    counted_by_name: c.counted_by_name,
                })));

                countsRes.forEach(c => {
                    activities.push({
                        activity_id: `act-cycle-${c.count_id}`,
                        store_id: c.store_id,
                        activity_type: "CYCLE_COUNT_UPDATED",
                        title: `Cycle Count #${c.count_id} - ${c.category_name}`,
                        description: `Status: ${c.status} • Progress: ${c.counted_items}/${c.total_items}`,
                        timestamp: c.count_date || new Date().toISOString(),
                        metadata: { count_id: c.count_id, counted_by: (c as any).counted_by },
                    });
                });
            }
        } catch {}

        try {
            const posRes = await callApi<PurchaseOrderSummary[]>(
                `${ENDPOINTS.SALES_FLOOR.RECEIVING.purchaseOrders}${storeQueryOnly}`,
                { method: "GET" }, logout
            );
            if (posRes && Array.isArray(posRes)) {
                posRes.forEach(po => {
                    activities.push({
                        activity_id: `act-po-${po.po_id}`,
                        store_id: po.store_id,
                        activity_type: "RECEIVING_DOCK",
                        title: `PO #${po.po_id} (${po.supplier_name})`,
                        description: `${po.item_count} item(s) • Status: ${po.status}`,
                        timestamp: po.arrived_at || po.expected_at || po.ordered_at || new Date().toISOString(),
                        metadata: { po_id: po.po_id },
                    });
                });
            }
        } catch {}

        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLiveActivities(activities);
    }, [activeStoreId, logout]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadInitialData();
        setIsRefreshing(false);
    };

    const handleActivityPress = (act: StoreActivityPayload) => {
        const meta = act.metadata as Record<string, any> | undefined;
        const orderId = meta?.order_id || (act.title.match(/#(\d+)/) ? Number(act.title.match(/#(\d+)/)![1]) : null);
        const countId = meta?.count_id || (act.title.match(/Count #(\d+)/) ? Number(act.title.match(/Count #(\d+)/)![1]) : null);
        const poId = meta?.po_id || (act.title.match(/PO #(\d+)/) ? Number(act.title.match(/PO #(\d+)/)![1]) : null);

        if (act.activity_type.includes("ORDER") && orderId) {
            router.push({ pathname: `/(app)/(tabs)/home/actions/sales_floor/Orders/${orderId}`, params: { from: "activities" } } as any);
        } else if (act.activity_type.includes("CYCLE") && countId) {
            router.push({ pathname: "/(app)/(tabs)/home/actions/back_room/CycleCountDetail", params: { id: String(countId), from: "activities" } } as any);
        } else if ((act.activity_type.includes("RECEIVING") || act.activity_type.includes("PO")) && poId) {
            router.push({ pathname: "/(app)/(tabs)/home/actions/back_room/ReceivePO", params: { po_id: String(poId), from: "activities" } } as any);
        }
    };

    // Derived Lists
    const isCompleted = (act: StoreActivityPayload) => {
        const t = act.description.toUpperCase();
        return t.includes("RELEASED") || t.includes("CANCELLED") || t.includes("DELIVERED") || t.includes("STATUS: RECEIVED") || t.includes("STATUS: APPROVED") || t.includes("STATUS: SUBMITTED");
    };

    const assignedActivities = useMemo(() => {
        return liveActivities.filter(a => !isCompleted(a) && (a.metadata?.assigned_to === currentEmpId || a.metadata?.counted_by === currentEmpId));
    }, [liveActivities, currentEmpId]);

    const tasksActivities = useMemo(() => {
        return liveActivities.filter(a => !isCompleted(a));
    }, [liveActivities]);

    const completedActivities = useMemo(() => {
        return liveActivities.filter(a => isCompleted(a));
    }, [liveActivities]);

    const renderActivityCard = ({ item }: { item: StoreActivityPayload }) => (
        <TouchableOpacity
            key={item.activity_id}
            activeOpacity={0.7}
            onPress={() => handleActivityPress(item)}
            style={[globalStyles.card, styles.activityCard]}
        >
            <View style={styles.activityIconCircle}>
                <Ionicons
                    name={
                        item.activity_type.includes("TIMEOUT") || item.activity_type.includes("CANCEL")
                            ? "time-outline"
                            : item.activity_type.includes("ORDER")
                                ? "cart"
                                : item.activity_type.includes("CYCLE")
                                    ? "barcode"
                                    : item.activity_type.includes("RECEIVING") || item.activity_type.includes("PO")
                                        ? "cube"
                                        : "notifications-outline"
                    }
                    size={16}
                    color={COLORS.primary}
                />
            </View>
            <View style={styles.activityContent}>
                <View style={styles.activityHeaderRow}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <View style={styles.activityTimeGroup}>
                        <Text style={styles.activityTime}>
                            {new Date(item.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })} {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
                    </View>
                </View>
                <Text style={styles.activityDescription}>{item.description}</Text>
            </View>
        </TouchableOpacity>
    );

    const ListEmpty = () => (
        <View style={styles.emptyCard}>
            <Ionicons name="pulse-outline" size={32} color={COLORS.textSecondary} />
            <Text style={styles.emptyCardText}>No activity recorded yet</Text>
        </View>
    );

    return (
        <TopSafeAreaView style={{ flex: 1 }}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Activities</Text>}
            />
            {toastMessage && (
                <Animated.View style={[styles.toastBanner, { opacity: toastOpacity, zIndex: 999 }]}>
                    <Ionicons name="flash" size={16} color="#FFFFFF" />
                    <Text style={styles.toastText} numberOfLines={2}>{toastMessage}</Text>
                </Animated.View>
            )}
            <Tab.Navigator
                screenOptions={{
                    tabBarActiveTintColor: COLORS.primary,
                    tabBarInactiveTintColor: COLORS.textSecondary,
                    tabBarIndicatorStyle: { backgroundColor: COLORS.primary },
                    tabBarStyle: { backgroundColor: COLORS.surface },
                    tabBarLabelStyle: { fontWeight: "bold", textTransform: "none" },
                }}
            >
                <Tab.Screen name="Assigned">
                    {() => (
                        <FlatList
                            data={assignedActivities}
                            keyExtractor={(item) => item.activity_id + "-assigned"}
                            renderItem={renderActivityCard}
                            ListEmptyComponent={ListEmpty}
                            contentContainerStyle={styles.listContent}
                            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
                        />
                    )}
                </Tab.Screen>
                <Tab.Screen name="Tasks">
                    {() => (
                        <FlatList
                            data={tasksActivities}
                            keyExtractor={(item) => item.activity_id + "-tasks"}
                            renderItem={renderActivityCard}
                            ListEmptyComponent={ListEmpty}
                            contentContainerStyle={styles.listContent}
                            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
                        />
                    )}
                </Tab.Screen>
                <Tab.Screen name="Completed">
                    {() => (
                        <FlatList
                            data={completedActivities}
                            keyExtractor={(item) => item.activity_id + "-completed"}
                            renderItem={renderActivityCard}
                            ListEmptyComponent={ListEmpty}
                            contentContainerStyle={styles.listContent}
                            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
                        />
                    )}
                </Tab.Screen>
            </Tab.Navigator>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    activityCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        marginBottom: 12,
    },
    activityIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#E8EAF6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 4,
    },
    activityTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: 8,
    },
    activityTimeGroup: {
        flexDirection: "row",
        alignItems: "center",
    },
    activityTime: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginRight: 4,
    },
    activityDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    emptyCard: {
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        marginTop: 20,
    },
    emptyCardText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginTop: 12,
    },
    toastBanner: {
        position: "absolute",
        top: 60,
        left: 16,
        right: 16,
        backgroundColor: COLORS.success,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    toastText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
        marginLeft: 8,
        flex: 1,
    },
});
