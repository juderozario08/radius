import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { DetailRow } from "@/components/common/DetailRow";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import { callApi } from "@/utils/helpers";
import { GetOnlineOrderByIDResponse, OnlineOrder, OnlineOrderItem } from "@/types/order.types";
import { router, useLocalSearchParams } from "expo-router";

const getStatusColor = (status: string) => {
    switch (status) {
        case "READY FOR PICKUP":
            return { bg: "#FFF3E0", text: "#E65100" };
        case "AWAITING PICKUP":
            return { bg: "#FFF8E1", text: "#F57F17" };
        case "RELEASED":
        case "DELIVERED":
            return { bg: "#E8F5E9", text: "#2E7D32" };
        case "WORK IN PROGRESS":
            return { bg: "#E3F2FD", text: "#1565C0" };
        case "SHIPPED":
            return { bg: "#F3E5F5", text: "#6A1B9A" };
        case "DELIVERING":
            return { bg: "#E0F7FA", text: "#006064" };
        default:
            return { bg: COLORS.surface, text: COLORS.textSecondary };
    }
};

export default function OnlineOrderDetail() {
    const { id } = useLocalSearchParams();
    const { logout } = useAuth();
    
    const [order, setOrder] = useState<OnlineOrder | null>(null);
    const [items, setItems] = useState<OnlineOrderItem[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchOrderDetails();
        }
    }, [id]);

    const fetchOrderDetails = async () => {
        setIsLoading(true);
        setError(null);

        const endpoint = `${ENDPOINTS.AUTHENTICATED.SERVICE.ONLINE_ORDERS.get}?id=${id}`;
        const data = await callApi<GetOnlineOrderByIDResponse>(endpoint, { method: "GET" }, logout);

        if (data) {
            setOrder(data.online_order);
            setItems(data.items || []);
        } else {
            setError("Could not load order details. Please try again.");
        }
        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <TopSafeAreaView>
                <HeaderComponent headerLeft={<BackButton />} headerCenter={<Text style={globalStyles.headerTitle}>Loading...</Text>} />
                <View style={globalStyles.container}>
                    <ActivityIndicator size="large" color={COLORS.primary} style={globalStyles.centerElement} />
                </View>
            </TopSafeAreaView>
        );
    }

    if (error || !order) {
        return (
            <TopSafeAreaView>
                <HeaderComponent headerLeft={<BackButton />} headerCenter={<Text style={globalStyles.headerTitle}>Error</Text>} />
                <View style={globalStyles.container}>
                    <Text style={globalStyles.errorText}>{error || "Order not found."}</Text>
                </View>
            </TopSafeAreaView>
        );
    }

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Order #{order.order_id}</Text>}
            />

            <ScrollView style={globalStyles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <View style={globalStyles.cardHeader}>
                        <Text style={styles.sectionTitle}>Details</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status).bg }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(order.status).text }]}>{order.status}</Text>
                        </View>
                    </View>
                    <DetailRow label="Type:" value={order.order_type} />
                    <DetailRow label="Customer:" value={order.customer_name} />
                    <DetailRow label="Email:" value={order.customer_email} />
                    <DetailRow label="Store ID:" value={order.store_id} />
                    <DetailRow label="Placed:" value={new Date(order.placed_at).toLocaleString()} />
                    {order.fulfilled_at && (
                        <DetailRow label="Fulfilled:" value={new Date(order.fulfilled_at).toLocaleString()} />
                    )}
                </View>

                {order.order_type !== 'PICKUP' && (
                    <View style={styles.card}>
                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Shipping</Text>
                        <DetailRow label="Address:" value={order.shipping_address || 'N/A'} />
                        <DetailRow label="Carrier:" value={order.carrier || 'N/A'} />
                        <DetailRow label="Tracking:" value={order.tracking_number || 'N/A'} />
                        {order.estimated_delivery_date && (
                            <DetailRow label="Est. Delivery:" value={new Date(order.estimated_delivery_date).toLocaleDateString()} />
                        )}
                        {order.actual_delivery_date && (
                            <DetailRow label="Actual Delivery:" value={new Date(order.actual_delivery_date).toLocaleDateString()} />
                        )}
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Financials</Text>
                    <DetailRow label="Subtotal:" value={`$${(order.subtotal || 0).toFixed(2)}`} />
                    <DetailRow label="Tax:" value={`$${(order.tax_amount || 0).toFixed(2)}`} />
                    <DetailRow label="Shipping:" value={`$${(order.shipping_fee || 0).toFixed(2)}`} />
                    <DetailRow label="Discount:" value={`$${(order.discount_total || 0).toFixed(2)}`} />
                    {order.promo_code && <DetailRow label="Promo:" value={order.promo_code} />}
                    <View style={globalStyles.divider} />
                    <DetailRow label="Total:" value={`$${(order.total_amount || 0).toFixed(2)}`} />
                    <View style={globalStyles.divider} />
                    <DetailRow label="Cost Total:" value={`$${(order.cost_total || 0).toFixed(2)}`} />
                    <DetailRow label="Est. Margin:" value={`$${((order.subtotal || 0) - (order.cost_total || 0)).toFixed(2)}`} />
                </View>

                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Items ({items.length})</Text>
                    {items.map((item) => (
                        <TouchableOpacity
                            key={item.order_item_id}
                            style={styles.itemRow}
                            activeOpacity={0.7}
                            onPress={() => router.push(`/(app)/product/${item.product_id}` as any)}
                        >
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemText}>SKU: {item.product_sku || "N/A"}</Text>
                                <Text style={styles.itemSubText}>Qty: {item.quantity} (Picked: {item.picked_qty})</Text>
                                <Text style={styles.itemSubText}>Price: ${(item.unit_price || 0).toFixed(2)}</Text>
                            </View>
                            <Text style={styles.itemTotal}>
                                ${ ((item.quantity * (item.unit_price || 0)) - (item.discount_amount || 0)).toFixed(2) }
                            </Text>
                        </TouchableOpacity>
                    ))}
                    {items.length === 0 && <Text style={globalStyles.emptyText}>No items found.</Text>}
                </View>
                
                <View style={{ height: 40 }} />
            </ScrollView>
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    itemInfo: {
        flex: 1,
    },
    itemText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    itemSubText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.primary,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
