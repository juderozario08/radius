import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { DetailRow } from "@/components/common/DetailRow";
import React, { useEffect, useState, useCallback } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import { callApi } from "@/utils/helpers";
import Pagination from "@/components/common/Pagination";
import { GetAllPrintOrdersResponse, PrintOrder } from "@/types/print_order.types";
import { router, useLocalSearchParams } from "expo-router";
import { SwipeableTopTabs } from "@/components/common/SwipeableTopTabs";
import { Ionicons } from "@expo/vector-icons";

const getStatusColor = (status: string) => {
    switch (status) {
        case "READY FOR PICKUP":
            return { bg: "#FFF3E0", text: "#E65100" }; // Orange
        case "PENDING":
            return { bg: "#FFF8E1", text: "#F57F17" }; // Amber
        case "COMPLETED":
        case "DELIVERED":
        case "RELEASED":
            return { bg: "#E8F5E9", text: "#2E7D32" }; // Green
        case "IN PROGRESS":
        case "WORK IN PROGRESS":
            return { bg: "#E3F2FD", text: "#1565C0" }; // Blue
        case "SHIPPED":
            return { bg: "#F3E5F5", text: "#6A1B9A" }; // Purple
        case "CANCELLED":
            return { bg: "#FFEBEE", text: "#C62828" }; // Red
        default:
            return { bg: COLORS.surface, text: COLORS.textSecondary };
    }
};

export default function PrintOrdersList() {
    const { logout } = useAuth();
    const params = useLocalSearchParams();
    const [webOrders, setWebOrders] = useState<PrintOrder[]>([]);
    const [walkInOrders, setWalkInOrders] = useState<PrintOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [webPage, setWebPage] = useState(1);
    const [walkInPage, setWalkInPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [webTotal, setWebTotal] = useState(0);
    const [walkInTotal, setWalkInTotal] = useState(0);

    const [filter, setFilter] = useState<"WEB" | "WALK_IN">((params.filter as "WEB" | "WALK_IN") || "WEB");

    const searchParams = {
        order_id: (params.order_id as string) || "",
        customer_name: (params.customer_name as string) || "",
        customer_email: (params.customer_email as string) || "",
        customer_phone: (params.customer_phone as string) || "",
        status: (params.status as string) || "",
        order_type: (params.order_type as string) || "",
    };

    useEffect(() => {
        loadAll();
    }, [JSON.stringify(params)]);

    useEffect(() => {
        loadAll();
    }, [pageSize]);

    useEffect(() => {
        if (!isLoading) fetchOrders("WEB", webPage, pageSize);
    }, [webPage]);

    useEffect(() => {
        if (!isLoading) fetchOrders("WALK_IN", walkInPage, pageSize);
    }, [walkInPage]);

    const loadAll = async () => {
        setIsLoading(true);
        setError(null);
        await fetchOrders("WEB", webPage, pageSize);
        await fetchOrders("WALK_IN", walkInPage, pageSize);
        setIsLoading(false);
    };

    const fetchOrders = async (type: string, page: number, limit: number) => {
        const queryParams = new URLSearchParams({
            page_size: limit.toString(),
            page_number: page.toString(),
            order_type: type,
        });

        Object.entries(searchParams).forEach(([key, value]) => {
            if (value && key !== "order_type") queryParams.append(key, value);
        });

        const endpoint = `${ENDPOINTS.SALES_FLOOR.ORDERS.PRINT.getAll}?${queryParams.toString()}`;
        const data = await callApi<GetAllPrintOrdersResponse>(endpoint, { method: "GET" }, logout);

        if (data) {
            if (type === "WEB") {
                setWebOrders(data.print_orders || []);
                setWebTotal(data.total_length || 0);
            } else {
                setWalkInOrders(data.print_orders || []);
                setWalkInTotal(data.total_length || 0);
            }
        } else {
            setError("Could not load print orders.");
        }
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setWebPage(1);
        setWalkInPage(1);
    };

    const renderOrderCard = useCallback(({ item }: { item: PrintOrder }) => {
        const date = new Date(item.placed_at).toLocaleString();
        const displayType = item.order_type === "WEB" ? "Web Order" : "Walk-In";

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/(app)/(tabs)/home/actions/service/PrintOrders/${item.print_order_id}` as any)}
            >
                <View style={globalStyles.cardHeader}>
                    <Text style={styles.name}>Order #{item.print_order_id}</Text>
                    <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(item.status).bg }]}>
                        <Text style={[styles.orderStatusText, { color: getStatusColor(item.status).text }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>
                <View style={styles.detailsContainer}>
                    <DetailRow layout="inline" label="Type: " value={displayType} />
                    <DetailRow layout="inline" label="Customer: " value={item.customer_name} />
                    {item.customer_phone ? (
                        <DetailRow layout="inline" label="Phone: " value={item.customer_phone} />
                    ) : null}
                    <DetailRow layout="inline" label="Total: " value={`$${(item.total_amount || 0).toFixed(2)}`} />
                    <DetailRow layout="inline" label="Placed: " value={date} />
                </View>
            </TouchableOpacity>
        );
    }, []);

    const renderListContent = (isWeb: boolean) => {
        const currentOrders = isWeb ? webOrders : walkInOrders;
        const currentTotal = isWeb ? webTotal : walkInTotal;
        const currentPage = isWeb ? webPage : walkInPage;
        const setPage = isWeb ? setWebPage : setWalkInPage;
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
                            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                                <Text style={globalStyles.emptyText}>No print orders found.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={currentOrders}
                                keyExtractor={(item) => item.print_order_id.toString()}
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
                headerCenter={<Text style={globalStyles.headerTitle}>Print Orders</Text>}
                headerRight={
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <TouchableOpacity onPress={() => loadAll()} style={{ padding: 8 }}>
                            <Ionicons name="refresh" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() =>
                                router.push(
                                    `/(app)/(tabs)/home/actions/service/PrintOrders/search?active_tab=${filter}&order_type=${searchParams.order_type}&order_id=${searchParams.order_id}&customer_name=${searchParams.customer_name}&customer_email=${searchParams.customer_email}&customer_phone=${searchParams.customer_phone}&status=${searchParams.status}` as any
                                )
                            }
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="search" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>
                }
            />

            <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                <SwipeableTopTabs
                    tabs={[
                        {
                            name: "Web Orders",
                            children: () => renderListContent(true),
                        },
                        {
                            name: "Walk-In",
                            children: () => renderListContent(false),
                        },
                    ]}
                    onTabChange={(index) => {
                        setFilter(index === 0 ? "WEB" : "WALK_IN");
                    }}
                />
            </View>
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
        marginRight: 8,
    },
    detailsContainer: {
        gap: 6,
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
        textTransform: "uppercase",
    },
});
