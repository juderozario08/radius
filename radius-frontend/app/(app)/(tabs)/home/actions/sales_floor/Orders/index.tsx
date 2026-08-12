import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DetailRow } from "@/components/common/DetailRow";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    TextInput
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import CustomToast from "@/components/common/Toast";
import { callApi } from "@/utils/helpers";
import Pagination from "@/components/common/Pagination";
import { GetAllOnlineOrdersResponse, OnlineOrder } from "@/types/order.types";
import { router, useLocalSearchParams } from "expo-router";
import { SwipeableTopTabs } from "@/components/common/SwipeableTopTabs";
import { Ionicons } from "@expo/vector-icons";

const getStatusColor = (status: string) => {
    switch (status) {
        case "READY FOR PICKUP":
            return { bg: "#FFF3E0", text: "#E65100" }; // Orange
        case "AWAITING PICKUP":
            return { bg: "#FFF8E1", text: "#F57F17" }; // Amber
        case "RELEASED":
        case "DELIVERED":
            return { bg: "#E8F5E9", text: "#2E7D32" }; // Green
        case "WORK IN PROGRESS":
            return { bg: "#E3F2FD", text: "#1565C0" }; // Blue
        case "SHIPPED":
            return { bg: "#F3E5F5", text: "#6A1B9A" }; // Purple
        case "DELIVERING":
            return { bg: "#E0F7FA", text: "#006064" }; // Cyan
        default:
            return { bg: COLORS.surface, text: COLORS.textSecondary };
    }
};

export default function OnlineOrdersList() {
    const { logout } = useAuth();
    const params = useLocalSearchParams();
    const [bopisOrders, setBopisOrders] = useState<OnlineOrder[]>([]);
    const [stsOrders, setStsOrders] = useState<OnlineOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [bopisPage, setBopisPage] = useState(1);
    const [stsPage, setStsPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [bopisTotal, setBopisTotal] = useState(0);
    const [stsTotal, setStsTotal] = useState(0);

    const [filter, setFilter] = useState<"BOPIS" | "STS">((params.filter as "BOPIS" | "STS") || "BOPIS");

    const searchParams = {
        order_id: params.order_id as string || "",
        customer_first_name: params.customer_first_name as string || "",
        customer_last_name: params.customer_last_name as string || "",
        customer_email: params.customer_email as string || "",
        sku: params.sku as string || "",
        billing_phone: params.billing_phone as string || "",
        payment_card: params.payment_card as string || "",
        status: params.status as string || "",
        order_type: params.order_type as string || "", // For filtering
    };

    useEffect(() => {
        // Initial load only
        loadAll();
    }, [JSON.stringify(params)]);

    // Fetch when page size changes
    useEffect(() => {
        loadAll();
    }, [pageSize]);

    // Fetch individual pages when page numbers change
    useEffect(() => {
        if (!isLoading) fetchOrders("BOPIS", bopisPage, pageSize);
    }, [bopisPage]);

    useEffect(() => {
        if (!isLoading) fetchOrders("STS", stsPage, pageSize);
    }, [stsPage]);

    const loadAll = async () => {
        setIsLoading(true);
        setError(null);
        await Promise.all([
            fetchOrders("BOPIS", bopisPage, pageSize),
            fetchOrders("STS", stsPage, pageSize)
        ]);
        setIsLoading(false);
    };

    const fetchOrders = async (type: string, page: number, limit: number) => {
        let queryParams = new URLSearchParams({
            page_size: limit.toString(),
            page_number: page.toString(),
            order_type: type,
        });

        Object.entries(searchParams).forEach(([key, value]) => {
            if (value && key !== 'order_type') queryParams.append(key, value);
        });

        const endpoint = `${ENDPOINTS.AUTHENTICATED.SERVICE.ONLINE_ORDERS.getAll}?${queryParams.toString()}`;
        const data = await callApi<GetAllOnlineOrdersResponse>(endpoint, { method: "GET" }, logout);

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
    };

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
                onPress={() => router.push(`/(app)/(tabs)/home/actions/sales_floor/Orders/${item.order_id}` as any)}
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
                    <DetailRow layout="inline" label="Total: " value={`$${(item.total_amount || 0).toFixed(2)}`} />
                    <DetailRow layout="inline" label="Placed: " value={date} />
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
                    <ActivityIndicator size="large" color={COLORS.primary} style={globalStyles.centerElement} />
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
                        <TouchableOpacity onPress={() => loadAll()} style={{ padding: 8 }}>
                            <Ionicons name="refresh" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push(`/(app)/(tabs)/home/actions/sales_floor/Orders/search?active_tab=${filter}&order_type=${searchParams.order_type}&order_id=${searchParams.order_id}&customer_first_name=${searchParams.customer_first_name}&customer_last_name=${searchParams.customer_last_name}&customer_email=${searchParams.customer_email}&sku=${searchParams.sku}&billing_phone=${searchParams.billing_phone}&payment_card=${searchParams.payment_card}&status=${searchParams.status}` as any)} style={{ padding: 8 }}>
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

            <CustomToast />
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    listWrapper: {
        flex: 1,
        paddingBottom: 0,
    },
    name: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: 8
    },
    detailsContainer: {
        gap: 6
    },
    filterBtn: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    filterBtnText: {
        color: COLORS.primary,
        fontWeight: "600",
        fontSize: 12,
    },
    orderStatusBadge: {
        borderWidth: 1,
        borderColor: "transparent",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    orderStatusText: {
        fontSize: 10,
        fontWeight: "700",
        textTransform: "uppercase"
    }
});
