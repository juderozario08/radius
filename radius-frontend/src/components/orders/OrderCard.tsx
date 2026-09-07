// radius-frontend/src/components/orders/OrderCard.tsx
import React, { useEffect, useRef } from "react";
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    StyleProp,
    ViewStyle,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OnlineOrder } from "@/types/order.types";

export interface OrderCardData {
    order_id: number;
    customer_name: string;
    order_type: string;
    status: string;
    total_amount: number;
    placed_at?: string;
    created_at?: string;
    items_count?: number;
}

export interface OrderCardProps {
    order: OnlineOrder | OrderCardData;
    onPress?: () => void;
    isNew?: boolean;
    style?: StyleProp<ViewStyle>;
}

/**
 * Lightweight helper to format relative time ago strings without external dependencies.
 */
export function formatTimeAgo(dateString?: string): string {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return "Just now";
    if (diffSec < 3600) {
        const mins = Math.max(1, Math.floor(diffSec / 60));
        return `${mins}m ago`;
    }
    if (diffSec < 86400) {
        const hours = Math.floor(diffSec / 3600);
        return `${hours}h ago`;
    }
    const days = Math.floor(diffSec / 86400);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Returns distinct styling for order type badge (BOPIS vs. STS vs. SHIPPING).
 */
export const getOrderTypeStyle = (type?: string) => {
    const normalized = (type || "").toUpperCase();
    switch (normalized) {
        case "BOPIS":
            return { bg: "#E3F2FD", text: "#1565C0", label: "BOPIS" };
        case "STS":
            return { bg: "#EDE7F6", text: "#512DA8", label: "STS" };
        case "SHIPPING":
        case "DELIVERY":
            return { bg: "#E0F2F1", text: "#00796B", label: "SHIPPING" };
        default:
            return { bg: COLORS.neutralBg, text: COLORS.textSecondary, label: type || "ORDER" };
    }
};

/**
 * Reusable Order Card component displaying customer name, order type badge (BOPIS/STS),
 * items count, total amount, time ago, and real-time highlight animation when newly arrived.
 */
export const OrderCard: React.FC<OrderCardProps> = ({
    order,
    onPress,
    isNew = false,
    style,
}) => {
    const typeStyle = getOrderTypeStyle(order.order_type);
    const dateStr = order.placed_at || (order as any).created_at;
    const timeAgo = formatTimeAgo(dateStr);
    const itemsCount = (order as any).items_count ?? 1;

    // Real-time highlight animation for newly arrived orders
    const animValue = useRef(new Animated.Value(isNew ? 1 : 0)).current;

    useEffect(() => {
        if (isNew) {
            animValue.setValue(1);
            Animated.timing(animValue, {
                toValue: 0,
                duration: 2500,
                useNativeDriver: false,
            }).start();
        }
    }, [isNew, animValue]);

    const animatedBgColor = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [COLORS.surface, COLORS.activeBg],
    });

    const animatedBorderColor = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [COLORS.border, COLORS.success],
    });

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    backgroundColor: animatedBgColor,
                    borderColor: animatedBorderColor,
                },
                style,
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onPress}
                disabled={!onPress}
            >
                {/* Top row: Order ID, Type Badge, New Indicator, and Status Badge */}
                <View style={styles.headerRow}>
                    <View style={styles.orderIdGroup}>
                        <Text style={styles.orderIdText}>Order #{order.order_id}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
                            <Text style={[styles.typeBadgeText, { color: typeStyle.text }]}>
                                {typeStyle.label}
                            </Text>
                        </View>
                        {isNew && (
                            <View style={styles.liveBadge}>
                                <Text style={styles.liveBadgeText}>⚡ NEW</Text>
                            </View>
                        )}
                    </View>
                    <OrderStatusBadge status={order.status} />
                </View>

                {/* Middle row: Customer Name */}
                <View style={styles.customerRow}>
                    <Ionicons name="person-outline" size={15} color={COLORS.textSecondary} />
                    <Text style={styles.customerName} numberOfLines={1}>
                        {order.customer_name || "Guest Customer"}
                    </Text>
                </View>

                {/* Bottom row: Items Count, Relative Time, and Total Amount */}
                <View style={styles.footerRow}>
                    <View style={styles.metaGroup}>
                        <View style={styles.metaItem}>
                            <Ionicons name="cube-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.metaText}>
                                {itemsCount} {itemsCount === 1 ? "item" : "items"}
                            </Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.metaText}>{timeAgo}</Text>
                        </View>
                    </View>

                    <Text style={styles.totalAmount}>
                        ${Number(order.total_amount || 0).toFixed(2)}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default OrderCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    orderIdGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexShrink: 1,
    },
    orderIdText: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    liveBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    liveBadgeText: {
        color: COLORS.primaryText,
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    customerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
    },
    customerName: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textPrimary,
        flex: 1,
    },
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    metaGroup: {
        flexDirection: "row",
        alignItems: "center",
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    metaDivider: {
        width: 1,
        height: 12,
        backgroundColor: COLORS.border,
        marginHorizontal: 8,
    },
    metaText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    totalAmount: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
});
