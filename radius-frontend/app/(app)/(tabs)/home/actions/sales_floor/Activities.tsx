import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Animated, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { TopSafeAreaView } from '@/components/common/TopSafeAreaView';
import HeaderComponent from '@/components/common/HeaderComponent';
import BackButton from '@/components/common/BackButton';
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from '@/constants/styles';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { callApi } from '@/utils/helpers';
import { ENDPOINTS } from '@/constants/routes';
import { StoreActivityPayload } from '@/types/websocket.types';
import { GetAllOnlineOrdersResponse } from '@/types/order.types';
import { CycleCountSummary } from '@/types/cyclecount.types';
import { PurchaseOrderSummary } from '@/types/receiving.types';

const Tab = createMaterialTopTabNavigator();

export default function Activities() {
    const { user, logout } = useAuth();
    const activeStoreId = user?.store_id ?? 2;
    const currentEmpId = user?.employee_id;

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
            showToast(`⚡ New Order #${payload.order_id} Received`);
            setLiveActivities((prev) => {
                const newAct: StoreActivityPayload = {
                    activity_id: `act-order-${payload.order_id}-${Date.now()}`,
                    store_id: payload.store_id,
                    activity_type: "ORDER_PLACED",
                    title: `New Online Order #${payload.order_id}`,
                    description: `${payload.customer_name} placed ${payload.order_type} order`,
                    timestamp: payload.placed_at || new Date().toISOString(),
                    metadata: { order_id: payload.order_id, assigned_to: payload.assigned_to },
                };
                return [newAct, ...prev.filter((a) => a.activity_id !== newAct.activity_id)];
            });
        },
        onOrderStatusUpdated: (payload) => {
            setLiveActivities((prev) => {
                const newAct: StoreActivityPayload = {
                    activity_id: `act-status-${payload.order_id}-${Date.now()}`,
                    store_id: payload.store_id,
                    activity_type: "ORDER_STATUS_CHANGED",
                    title: `Order #${payload.order_id} Updated`,
                    description: payload.assigned_to_name ? `Assigned to ${payload.assigned_to_name}` : `Moved to ${payload.new_status}`,
                    timestamp: payload.updated_at || new Date().toISOString(),
                    metadata: { order_id: payload.order_id, assigned_to: payload.assigned_to },
                };
                return [newAct, ...prev.filter((a) => a.activity_id !== newAct.activity_id)];
            });
        },
        onCycleCountUpdated: (payload) => {
            setLiveActivities((prev) => {
                const newAct: StoreActivityPayload = {
                    activity_id: `act-cycle-${payload.count_id}-${Date.now()}`,
                    store_id: payload.store_id,
                    activity_type: "CYCLE_COUNT_UPDATED",
                    title: `Cycle Count #${payload.count_id} - ${payload.category_name}`,
                    description: `Status: ${payload.status} • Action: ${payload.action}`,
                    timestamp: payload.updated_at || new Date().toISOString(),
                    metadata: { count_id: payload.count_id },
                };
                return [newAct, ...prev.filter((a) => a.activity_id !== newAct.activity_id)];
            });
        },
        onStoreActivity: (payload) => {
            if (payload.activity_type.includes("POS") || payload.activity_type.includes("TRANSACTION") || payload.activity_type.includes("FILL") || payload.activity_type.includes("STOCK")) {
                return;
            }
            setLiveActivities((prev) => [
                payload,
                ...prev.filter((a) => a.activity_id !== payload.activity_id),
            ]);
        },
    });

    const loadInitialData = useCallback(async () => {
        const activities: StoreActivityPayload[] = [];
        const storeParam = activeStoreId ? `&store_id=${activeStoreId}` : "";
        const storeQueryOnly = activeStoreId ? `?store_id=${activeStoreId}` : "";

        const activeRes = await callApi<GetAllOnlineOrdersResponse>(
            `${ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.getAll}?page=1&page_size=40&dashboard_only=true${storeParam}`,
            { method: "GET" }, logout
        );
        const releasedRes = await callApi<GetAllOnlineOrdersResponse>(
            `${ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.getAll}?page=1&page_size=20&status=RELEASED${storeParam}`,
            { method: "GET" }, logout
        );
        const cancelledRes = await callApi<GetAllOnlineOrdersResponse>(
            `${ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.getAll}?page=1&page_size=10&status=CANCELLED${storeParam}`,
            { method: "GET" }, logout
        );

        const ordersLoaded = activeRes !== null && releasedRes !== null && cancelledRes !== null;
        const allFetchedOrders = ordersLoaded ? [
            ...(activeRes.online_orders || []),
            ...(releasedRes.online_orders || []),
            ...(cancelledRes.online_orders || []),
        ] : [];

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

        const countsRes = await callApi<CycleCountSummary[]>(
            `${ENDPOINTS.SALES_FLOOR.CYCLE_COUNT.getWeekly}${storeQueryOnly}`,
            { method: "GET" }, logout
        );
        const countsLoaded = Array.isArray(countsRes);
        if (countsLoaded) {
            countsRes.forEach(c => {
                activities.push({
                    activity_id: `act-cycle-${c.count_id}`,
                    store_id: c.store_id,
                    activity_type: "CYCLE_COUNT_UPDATED",
                    title: `Cycle Count #${c.count_id} - ${c.category_name}`,
                    description: `Status: ${c.status} • Progress: ${c.counted_items}/${c.total_items}`,
                    timestamp: c.count_date || new Date().toISOString(),
                    metadata: { count_id: c.count_id, counted_by: c.counted_by },
                });
            });
        }

        const posRes = await callApi<PurchaseOrderSummary[]>(
            `${ENDPOINTS.SALES_FLOOR.RECEIVING.purchaseOrders}${storeQueryOnly}`,
            { method: "GET" }, logout
        );
        const posLoaded = Array.isArray(posRes);
        if (posLoaded) {
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

        const keptTypes = [
            ...(ordersLoaded ? [] : ["ORDER_PLACED", "ORDER_STATUS_CHANGED"]),
            ...(countsLoaded ? [] : ["CYCLE_COUNT_UPDATED"]),
            ...(posLoaded ? [] : ["RECEIVING_DOCK"]),
        ];
        setLiveActivities((prev) => [
            ...prev.filter((a) => keptTypes.includes(a.activity_type)),
            ...activities,
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
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
        const meta = act.metadata;
        const orderId = meta?.order_id || (act.title.match(/#(\d+)/) ? Number(act.title.match(/#(\d+)/)![1]) : null);
        const countId = meta?.count_id || (act.title.match(/Count #(\d+)/) ? Number(act.title.match(/Count #(\d+)/)![1]) : null);
        const poId = meta?.po_id || (act.title.match(/PO #(\d+)/) ? Number(act.title.match(/PO #(\d+)/)![1]) : null);

        if (act.activity_type.includes("ORDER") && orderId) {
            router.push({ pathname: "/(app)/(tabs)/home/actions/sales_floor/Orders/[id]", params: { id: orderId, from: "activities" } });
        } else if (act.activity_type.includes("CYCLE") && countId) {
            router.push({ pathname: "/(app)/(tabs)/home/actions/back_room/CycleCountDetail", params: { id: String(countId), from: "activities" } });
        } else if ((act.activity_type.includes("RECEIVING") || act.activity_type.includes("PO")) && poId) {
            router.push({ pathname: "/(app)/(tabs)/home/actions/back_room/ReceivePO", params: { po_id: String(poId), from: "activities" } });
        }
    };

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
                    <Ionicons name="flash" size={16} color={COLORS.surface} />
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
        padding: SPACING.lg,
        paddingBottom: SPACING.huge,
    },
    activityCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: SPACING.lg,
        marginBottom: SPACING.md,
    },
    activityIconCircle: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.xlPlus,
        backgroundColor: COLORS.indigoBg,
        justifyContent: "center",
        alignItems: "center",
        marginRight: SPACING.md,
    },
    activityContent: {
        flex: 1,
    },
    activityHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: SPACING.xs,
    },
    activityTitle: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "600",
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: SPACING.sm,
    },
    activityTimeGroup: {
        flexDirection: "row",
        alignItems: "center",
    },
    activityTime: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginRight: SPACING.xs,
    },
    activityDescription: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    emptyCard: {
        padding: SPACING.huge,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        marginTop: SPACING.xl,
    },
    emptyCardText: {
        fontSize: FONT_SIZE.lg,
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
    },
    toastBanner: {
        position: "absolute",
        top: 60,
        left: 16,
        right: 16,
        backgroundColor: COLORS.success,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    toastText: {
        color: COLORS.surface,
        fontSize: FONT_SIZE.md,
        fontWeight: "600",
        marginLeft: SPACING.sm,
        flex: 1,
    },
});
