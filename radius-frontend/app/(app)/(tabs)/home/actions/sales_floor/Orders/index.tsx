import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DetailRow } from "@/components/common/DetailRow";
import React, { useEffect, useState, useCallback } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import CustomToast from "@/components/common/Toast";
import { callApi } from "@/utils/helpers";
import Pagination from "@/components/common/Pagination";
import { GetAllOnlineOrdersResponse, OnlineOrder } from "@/types/order.types";
import { router } from "expo-router";

export default function OnlineOrdersList() {
    const { logout } = useAuth();
    const [orders, setOrders] = useState<OnlineOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalLength, setTotalLength] = useState(0);

    const [filter, setFilter] = useState<"ALL" | "STS" | "BOPIS">("ALL");

    useEffect(() => {
        fetchOrders(pageNumber, pageSize, filter);
    }, [pageNumber, pageSize, filter]);

    const fetchOrders = async (page: number, limit: number, currentFilter: string) => {
        setIsLoading(true);
        setError(null);

        const endpoint = `${ENDPOINTS.AUTHENTICATED.SERVICE.ONLINE_ORDERS.getAll}?page_size=${limit}&page_number=${page}&filter=${currentFilter}`;
        const data = await callApi<GetAllOnlineOrdersResponse>(endpoint, { method: "GET" }, logout);

        if (data) {
            setOrders(data.online_orders || []);
            setTotalLength(data.total_length || 0);
        } else {
            setError("Could not load online orders. Please try again.");
        }
        setIsLoading(false);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPageNumber(1);
    };

    const toggleFilter = () => {
        setFilter((prev) => {
            if (prev === "ALL") return "STS";
            if (prev === "STS") return "BOPIS";
            return "ALL";
        });
        setPageNumber(1);
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
                    <StatusBadge isActive={item.status === 'COMPLETED'} />
                </View>
                <View style={styles.detailsContainer}>
                    <DetailRow layout="inline" label="Type: " value={item.order_type} />
                    <DetailRow layout="inline" label="Customer: " value={item.customer_name} />
                    <DetailRow layout="inline" label="Total: " value={`$${item.total_amount.toFixed(2)}`} />
                    <DetailRow layout="inline" label="Placed: " value={date} />
                    <DetailRow layout="inline" label="Status: " value={item.status} />
                </View>
            </TouchableOpacity>
        );
    }, []);

    const totalPages = Math.max(1, Math.ceil(totalLength / pageSize));

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Online Orders</Text>}
                headerRight={
                    <TouchableOpacity onPress={toggleFilter} style={styles.filterBtn}>
                        <Text style={styles.filterBtnText}>{filter}</Text>
                    </TouchableOpacity>
                }
            />

            <View style={[globalStyles.container, styles.listWrapper]}>
                {isLoading && orders.length === 0 ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={globalStyles.centerElement} />
                ) : error ? (
                    <Text style={globalStyles.errorText}>{error}</Text>
                ) : (
                    <>
                        {orders.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={globalStyles.emptyText}>No online orders found.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={orders}
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
                            currentPage={pageNumber}
                            totalPages={totalPages}
                            onPageChange={setPageNumber}
                            isLoading={isLoading}
                            pageSize={pageSize}
                            pageSizeOptions={[10, 20, 50]}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </>
                )}
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
    }
});
