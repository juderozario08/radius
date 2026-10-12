import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { DetailRow } from "@/components/common/DetailRow";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import { callApi } from "@/utils/helpers";
import Pagination from "@/components/common/Pagination";
import { GetAllOnlineOrdersResponse, OnlineOrder } from "@/types/order.types";
import { router, useLocalSearchParams } from "expo-router";
import { SwipeableTopTabs } from "@/components/common/SwipeableTopTabs";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatMoney } from "@/utils/money";

const getStatusColor = (status: string) => {
    switch (status) {
        case "READY FOR PICKUP":
            return { bg: COLORS.warningBg, text: COLORS.warning };
        case "AWAITING PICKUP":
            return { bg: COLORS.pendingBg, text: COLORS.pending };
        case "RELEASED":
        case "DELIVERED":
            return { bg: COLORS.activeBg, text: COLORS.success };
        case "WORK IN PROGRESS":
            return { bg: COLORS.infoBg, text: COLORS.info };
        case "SHIPPED":
            return { bg: COLORS.purpleBg, text: COLORS.purple };
        case "DELIVERING":
            return { bg: COLORS.cyanBg, text: COLORS.cyan };
        default:
            return { bg: COLORS.surface, text: COLORS.textSecondary };
    }
};

export default function OnlineOrdersList() {
    const { logout, user } = useAuth();
    const params = useLocalSearchParams();
    const [bopisOrders, setBopisOrders] = useState<OnlineOrder[]>([]);
    const [stsOrders, setStsOrders] = useState<OnlineOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestGeneration = useRef(0);

    const [bopisPage, setBopisPage] = useState(1);
    const [stsPage, setStsPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [bopisTotal, setBopisTotal] = useState(0);
    const [stsTotal, setStsTotal] = useState(0);

    const [filter, setFilter] = useState<"BOPIS" | "STS">((params.filter as "BOPIS" | "STS") || "BOPIS");

    const searchParams = useMemo(() => ({
        order_id: params.order_id as string || "",
        customer_first_name: params.customer_first_name as string || "",
        customer_last_name: params.customer_last_name as string || "",
        customer_email: params.customer_email as string || "",
        sku: params.sku as string || "",
        billing_phone: params.billing_phone as string || "",
        payment_card: params.payment_card as string || "",
        status: params.status as string || "",
        order_type: params.order_type as string || "",
    }), [params.order_id, params.customer_first_name, params.customer_last_name, params.customer_email, params.sku, params.billing_phone, params.payment_card, params.status, params.order_type]);

    const fetchOrders = useCallback(async (type: string, page: number, limit: number, generation: number) => {
        let queryParams = new URLSearchParams({
            page_size: limit.toString(),
            page_number: page.toString(),
            order_type: type,
        });

        Object.entries(searchParams).forEach(([key, value]) => {
            if (value && key !== 'order_type') queryParams.append(key, value);
        });

        const endpoint = `${ENDPOINTS.SALES_FLOOR.ORDERS.ONLINE.getAll}?${queryParams.toString()}`;
        const data = await callApi<GetAllOnlineOrdersResponse>(endpoint, { method: "GET" }, logout);
        if (generation !== requestGeneration.current) return;

        if (data) {
            if (type === "BOPIS") {
                setBopisOrders(data.online_orders || []);
                setBopisTotal(data.total_length || 0);
            } else {
                setStsOrders(data.online_orders || []);
                setStsTotal(data.total_length || 0);
            }
        } else {
            setError("Could not load online orders.");
        }
    }, [logout, searchParams]);

    const loadAll = useCallback(async () => {
        const generation = ++requestGeneration.current;
        setIsLoading(true);
        setError(null);
        await fetchOrders("BOPIS", bopisPage, pageSize, generation);
        if (generation !== requestGeneration.current) return;
        await fetchOrders("STS", stsPage, pageSize, generation);
        if (generation === requestGeneration.current) setIsLoading(false);
    }, [fetchOrders, bopisPage, stsPage, pageSize]);

    useEffect(() => {
        void loadAll();
    }, [loadAll, user?.store_id]);

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setBopisPage(1);
        setStsPage(1);
    };

    const renderOrderCard = useCallback(({ item }: { item: OnlineOrder }) => {
        const date = new Date(item.placed_at).toLocaleString();

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/(app)/(tabs)/home/actions/sales_floor/Orders/${item.order_id}`)}
            >
                <View style={globalStyles.cardHeader}>
                    <Text style={styles.name}>Order #{item.order_id}</Text>
                    <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(item.status).bg }]}>
                        <Text style={[styles.orderStatusText, { color: getStatusColor(item.status).text }]}>{item.status}</Text>
                    </View>
                </View>
                <View style={styles.detailsContainer}>
                    <DetailRow layout="inline" label="Type: " value={item.order_type} />
                    <DetailRow layout="inline" label="Customer: " value={item.customer_name} />
                    <DetailRow layout="inline" label="Total: " value={formatMoney(item.total_amount)} />
                    <DetailRow layout="inline" label="Placed: " value={date} />
                    <DetailRow layout="inline" label="Assigned: " value={item.assigned_to_name || "Unassigned"} />
                    <DetailRow layout="inline" label="Status: " value={item.status} />
                </View>
            </TouchableOpacity>
        );
    }, []);

    const renderListContent = (isBopis: boolean) => {
        const currentOrders = isBopis ? bopisOrders : stsOrders;
        const currentTotal = isBopis ? bopisTotal : stsTotal;
        const currentPage = isBopis ? bopisPage : stsPage;
        const setPage = isBopis ? setBopisPage : setStsPage;
        const totalPages = Math.max(1, Math.ceil(currentTotal / pageSize));

        return (
            <View style={[globalStyles.container, styles.listWrapper]}>
                {isLoading && currentOrders.length === 0 ? (
                    <LoadingSpinner style={globalStyles.centerElement} />
                ) : error ? (
                    <Text style={globalStyles.errorText}>{error}</Text>
                ) : (
                    <>
                        {currentOrders.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={globalStyles.emptyText}>No online orders found.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={currentOrders}
                                keyExtractor={(item) => item.order_id.toString()}
                                renderItem={renderOrderCard}
                                contentContainerStyle={globalStyles.listContainer}
                                showsVerticalScrollIndicator={false}
                                initialNumToRender={10}
                                windowSize={5}
                                maxToRenderPerBatch={10}
                            />
                        )}

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setPage}
                            isLoading={isLoading}
                            pageSize={pageSize}
                            pageSizeOptions={[10, 20, 50]}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </>
                )}
            </View>
        );
    };

    return (
        <TopSafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Online Orders</Text>}
                headerRight={
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <TouchableOpacity onPress={() => loadAll()} style={{ padding: SPACING.sm }}>
                            <Ionicons name="refresh" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push(`/(app)/(tabs)/home/actions/sales_floor/Orders/search?active_tab=${filter}&order_type=${searchParams.order_type}&order_id=${searchParams.order_id}&customer_first_name=${searchParams.customer_first_name}&customer_last_name=${searchParams.customer_last_name}&customer_email=${searchParams.customer_email}&sku=${searchParams.sku}&billing_phone=${searchParams.billing_phone}&payment_card=${searchParams.payment_card}&status=${searchParams.status}`)} style={{ padding: SPACING.sm }}>
                            <Ionicons name="search" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>
                }
            />

            <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                <SwipeableTopTabs
                    tabs={[
                        {
                            name: "BOPIS",
                            children: () => renderListContent(true)
                        },
                        {
                            name: "STS",
                            children: () => renderListContent(false)
                        }
                    ]}
                    onTabChange={(index) => {
                        setFilter(index === 0 ? "BOPIS" : "STS");
                    }}
                />
            </View>

        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    listWrapper: {
        flex: 1,
        paddingBottom: 0,
    },
    name: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: SPACING.sm
    },
    detailsContainer: {
        gap: SPACING.xsm
    },
    filterBtn: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xsm,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    filterBtnText: {
        color: COLORS.primary,
        fontWeight: "600",
        fontSize: FONT_SIZE.sm,
    },
    orderStatusBadge: {
        borderWidth: 1,
        borderColor: "transparent",
        paddingHorizontal: SPACING.smd,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.lg,
    },
    orderStatusText: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: "700",
        textTransform: "uppercase"
    }
});
