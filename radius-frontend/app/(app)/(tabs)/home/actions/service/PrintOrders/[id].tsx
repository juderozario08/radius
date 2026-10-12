import BackButton from "@/components/common/BackButton";
import HeaderComponent from "@/components/common/HeaderComponent";
import { ENDPOINTS } from "@/constants/routes";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { DetailRow } from "@/components/common/DetailRow";
import React, { useCallback, useEffect, useState } from "react";
import {
    FlatList,
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
            return { bg: COLORS.warningBg, text: COLORS.warning };
        case "PENDING":
            return { bg: COLORS.pendingBg, text: COLORS.pending };
        case "COMPLETED":
        case "DELIVERED":
        case "RELEASED":
            return { bg: COLORS.activeBg, text: COLORS.success };
        case "IN PROGRESS":
        case "WORK IN PROGRESS":
            return { bg: COLORS.infoBg, text: COLORS.info };
        case "SHIPPED":
            return { bg: COLORS.purpleBg, text: COLORS.purple };
        case "CANCELLED":
            return { bg: COLORS.inactiveBg, text: COLORS.dangerDark };
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

            <FlatList
                style={globalStyles.container}
                showsVerticalScrollIndicator={false}
                data={items}
                keyExtractor={(item) => String(item.print_order_item_id)}
                ListHeaderComponent={
                    <>
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
                                <Text style={[styles.sectionTitle, { marginBottom: SPACING.md }]}>Shipping / Delivery</Text>
                                <DetailRow label="Address:" value={order.shipping_address} />
                            </View>
                        )}

                        {order.notes ? (
                            <View style={styles.card}>
                                <Text style={[styles.sectionTitle, { marginBottom: SPACING.md }]}>Order Notes</Text>
                                <Text style={styles.notesText}>{order.notes}</Text>
                            </View>
                        ) : null}

                        <View style={styles.card}>
                            <Text style={[styles.sectionTitle, { marginBottom: SPACING.md }]}>Financials</Text>
                            <DetailRow label="Subtotal:" value={formatMoney(order.subtotal)} />
                            <DetailRow label="Tax:" value={formatMoney(order.tax_amount)} />
                            {order.shipping_fee > 0 && (
                                <DetailRow label="Shipping Fee:" value={formatMoney(order.shipping_fee)} />
                            )}
                            <View style={globalStyles.divider} />
                            <DetailRow label="Total:" value={formatMoney(order.total_amount)} />
                        </View>

                        <View style={globalStyles.listCardTop}>
                            <Text style={[styles.sectionTitle, { marginBottom: SPACING.md }]}>Print Items ({items.length})</Text>
                        </View>
                    </>
                }
                renderItem={({ item }) => (
                    <View style={globalStyles.listCardBody}>
                        <View style={styles.itemRow}>
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
                    </View>
                )}
                ListEmptyComponent={
                    <View style={globalStyles.listCardBody}>
                        <Text style={globalStyles.emptyText}>No items found for this order.</Text>
                    </View>
                }
                ListFooterComponent={
                    <View style={[globalStyles.listCardBottom, styles.listFooter]} />
                }
            />
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    actions: { gap: SPACING.sm, marginTop: SPACING.md },
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
    sectionTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    notesText: {
        fontSize: FONT_SIZE.mdl,
        color: COLORS.textPrimary,
        lineHeight: 22,
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    itemInfo: {
        flex: 1,
        marginRight: SPACING.md,
    },
    listFooter: {
        marginBottom: 56,
    },
    itemText: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    itemSubText: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
    },
    itemTotal: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.primary,
    },
    statusBadge: {
        paddingHorizontal: SPACING.smd,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.lg,
    },
    statusText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "700",
    },
});
