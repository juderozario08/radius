import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { DetailRow } from "@/components/common/DetailRow";
import React, { useCallback, useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    Pressable,
} from "react-native";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import { callApi } from "@/utils/helpers";
import { GetPrintOrderResponse, PrintOrder, PrintOrderItem, PrintOrderStatus } from "@/types/print_order.types";
import { useLocalSearchParams } from "expo-router";
import { useWebSocket } from "@/hooks/useWebSocket";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatMoney, multiplyMoney } from "@/utils/money";

const getStatusColor = (status: string) => {
    switch (status) {
        case "READY FOR PICKUP":
            return { bg: "#FFF3E0", text: "#E65100" };
        case "PENDING":
            return { bg: "#FFF8E1", text: "#F57F17" };
        case "COMPLETED":
        case "DELIVERED":
        case "RELEASED":
            return { bg: "#E8F5E9", text: "#2E7D32" };
        case "IN PROGRESS":
        case "WORK IN PROGRESS":
            return { bg: "#E3F2FD", text: "#1565C0" };
        case "SHIPPED":
            return { bg: "#F3E5F5", text: "#6A1B9A" };
        case "CANCELLED":
            return { bg: "#FFEBEE", text: "#C62828" };
        default:
            return { bg: COLORS.surface, text: COLORS.textSecondary };
    }
};

export default function PrintOrderDetail() {
    const { id } = useLocalSearchParams();
    const { logout, user } = useAuth();

    const [order, setOrder] = useState<PrintOrder | null>(null);
    const [items, setItems] = useState<PrintOrderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useWebSocket({
        onPrintOrderStatusUpdated: ({ print_order_id, new_status }) => {
            if (String(print_order_id) === id) {
                setOrder((current) => current ? { ...current, status: new_status } : current);
            }
        },
    });

    const fetchOrderDetails = useCallback(async () => {
        if (!id || typeof id !== "string") return;
        setIsLoading(true);
        setError(null);

        const endpoint = ENDPOINTS.SALES_FLOOR.ORDERS.PRINT.get(id);
        const data = await callApi<GetPrintOrderResponse>(endpoint, { method: "GET" }, logout);

        if (data && data.print_order) {
            setOrder(data.print_order);
            setItems(data.items || []);
        } else {
            setError("Could not load print order details. Please try again.");
        }
        setIsLoading(false);
    }, [id, logout]);

    useEffect(() => {
        void fetchOrderDetails();
    }, [fetchOrderDetails]);

    const statusActions: Partial<Record<PrintOrderStatus, PrintOrderStatus[]>> = {
        PENDING: ["IN PROGRESS", "CANCELLED"],
        "IN PROGRESS": ["READY FOR PICKUP", "SHIPPED", "CANCELLED"],
        "READY FOR PICKUP": ["COMPLETED", "CANCELLED"],
        SHIPPED: ["COMPLETED", "CANCELLED"],
    };

    const updateStatus = async (status: PrintOrderStatus) => {
        if (!id || typeof id !== "string" || isUpdating) return;
        setIsUpdating(true);
        const updated = await callApi<PrintOrder>(ENDPOINTS.SALES_FLOOR.ORDERS.PRINT.updateStatus(id), {
            method: "PUT",
            body: { status },
        }, logout);
        if (updated) setOrder(updated);
        setIsUpdating(false);
    };

    if (isLoading) {
        return (
            <TopSafeAreaView>
                <HeaderComponent
                    headerLeft={<BackButton />}
                    headerCenter={<Text style={globalStyles.headerTitle}>Loading...</Text>}
                />
                <View style={globalStyles.container}>
                    <LoadingSpinner style={globalStyles.centerElement} />
                </View>
            </TopSafeAreaView>
        );
    }

    if (error || !order) {
        return (
            <TopSafeAreaView>
                <HeaderComponent
                    headerLeft={<BackButton />}
                    headerCenter={<Text style={globalStyles.headerTitle}>Error</Text>}
                />
                <View style={globalStyles.container}>
                    <Text style={globalStyles.errorText}>{error || "Print order not found."}</Text>
                </View>
            </TopSafeAreaView>
        );
    }

    const displayType = order.order_type === "WEB" ? "Web Order" : "Walk-In";

    return (
        <TopSafeAreaView>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Order #{order.print_order_id}</Text>}
            />

            <ScrollView style={globalStyles.container} showsVerticalScrollIndicator={false}>
                {(user?.role === "SERVICE" || user?.role === "MANAGER" || user?.role === "ADMIN") && (statusActions[order.status]?.length ?? 0) > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Update status</Text>
                        <View style={styles.actions}>
                            {statusActions[order.status]?.map((status) => (
                                <Pressable key={status} disabled={isUpdating} onPress={() => void updateStatus(status)} style={status === "CANCELLED" ? globalStyles.buttonSecondary : globalStyles.buttonPrimary}>
                                    <Text style={status === "CANCELLED" ? globalStyles.buttonTextSecondary : globalStyles.buttonTextPrimary}>{status}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}
                <View style={styles.card}>
                    <View style={globalStyles.cardHeader}>
                        <Text style={styles.sectionTitle}>Details</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status).bg }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(order.status).text }]}>
                                {order.status}
                            </Text>
                        </View>
                    </View>
                    <DetailRow label="Type:" value={displayType} />
                    <DetailRow label="Customer:" value={order.customer_name} />
                    {order.customer_email ? <DetailRow label="Email:" value={order.customer_email} /> : null}
                    {order.customer_phone ? <DetailRow label="Phone:" value={order.customer_phone} /> : null}
                    <DetailRow label="Store ID:" value={order.store_id} />
                    <DetailRow label="Placed:" value={new Date(order.placed_at).toLocaleString()} />
                    {order.fulfilled_at && (
                        <DetailRow label="Fulfilled:" value={new Date(order.fulfilled_at).toLocaleString()} />
                    )}
                </View>

                {order.order_type === "WEB" && order.shipping_address && (
                    <View style={styles.card}>
                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Shipping / Delivery</Text>
                        <DetailRow label="Address:" value={order.shipping_address} />
                    </View>
                )}

                {order.notes ? (
                    <View style={styles.card}>
                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Order Notes</Text>
                        <Text style={styles.notesText}>{order.notes}</Text>
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Financials</Text>
                    <DetailRow label="Subtotal:" value={formatMoney(order.subtotal)} />
                    <DetailRow label="Tax:" value={formatMoney(order.tax_amount)} />
                    {order.shipping_fee > 0 && (
                        <DetailRow label="Shipping Fee:" value={formatMoney(order.shipping_fee)} />
                    )}
                    <View style={globalStyles.divider} />
                    <DetailRow label="Total:" value={formatMoney(order.total_amount)} />
                </View>

                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Print Items ({items.length})</Text>
                    {items.map((item) => (
                        <View key={item.print_order_item_id} style={styles.itemRow}>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemText}>{item.description}</Text>
                                <Text style={styles.itemSubText}>
                                    Qty: {item.quantity}  •  Unit Price: {formatMoney(item.unit_price)}
                                </Text>
                            </View>
                            <Text style={styles.itemTotal}>
                                {formatMoney(multiplyMoney(item.unit_price, item.quantity))}
                            </Text>
                        </View>
                    ))}
                    {items.length === 0 && <Text style={globalStyles.emptyText}>No items found for this order.</Text>}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    actions: { gap: 8, marginTop: 12 },
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
    notesText: {
        fontSize: 15,
        color: COLORS.textPrimary,
        lineHeight: 22,
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    itemInfo: {
        flex: 1,
        marginRight: 12,
    },
    itemText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    itemSubText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.primary,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "700",
    },
});
