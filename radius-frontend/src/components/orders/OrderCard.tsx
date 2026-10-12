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
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OnlineOrder } from "@/types/order.types";
import { type Money, formatMoney } from "@/utils/money";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

export interface OrderCardData {
    order_id: number;
    customer_name: string;
    order_type: string;
    status: string;
    total_amount: Money;
    placed_at?: string;
    created_at?: string;
    items_count?: number;
    assigned_to?: number | null;
    assigned_to_name?: string | null;
}

export interface OrderCardProps {
    order: OnlineOrder | OrderCardData;
    onPress?: () => void;
    isNew?: boolean;
    isAdmin?: boolean;
    style?: StyleProp<ViewStyle>;
}

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

export const getOrderTypeStyle = (type?: string) => {
    const normalized = (type || "").toUpperCase();
    switch (normalized) {
        case "BOPIS":
            return { bg: COLORS.infoBg, text: COLORS.info, label: "BOPIS" };
        case "STS":
            return { bg: COLORS.violetBg, text: COLORS.violetDark, label: "STS" };
        case "SHIPPING":
        case "DELIVERY":
            return { bg: COLORS.tealBg, text: COLORS.teal, label: "SHIPPING" };
        default:
            return { bg: COLORS.neutralBg, text: COLORS.textSecondary, label: type || "ORDER" };
    }
};

export const OrderCard: React.FC<OrderCardProps> = ({
    order,
    onPress,
    isNew = false,
    isAdmin = false,
    style,
}) => {
    const typeStyle = getOrderTypeStyle(order.order_type);
    const dateStr = order.placed_at || ("created_at" in order ? order.created_at : undefined);
    const timeAgo = formatTimeAgo(dateStr);
    const itemsCount = ("items_count" in order ? order.items_count : undefined) ?? 1;

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
                    <View style={styles.headerRightGroup}>
                        <OrderStatusBadge status={order.status} />
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                    </View>
                </View>

                <View style={styles.assignmentRow}>
                    {order.assigned_to_name ? (
                        <View style={styles.assigneeBadge}>
                            <Ionicons name="person" size={11} color={COLORS.info} />
                            <Text style={styles.assigneeText} numberOfLines={1}>
                                In Progress: {order.assigned_to_name}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.unassignedBadge}>
                            <Ionicons name={isAdmin ? "eye-outline" : "hand-right-outline"} size={11} color={COLORS.warning} />
                            <Text style={styles.unassignedText}>
                                {isAdmin ? "Unassigned • Tap to view" : "Unassigned • Tap to open & claim"}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.customerRow}>
                    <Ionicons name="person-outline" size={15} color={COLORS.textSecondary} />
                    <Text style={styles.customerName} numberOfLines={1}>
                        {order.customer_name || "Guest Customer"}
                    </Text>
                </View>

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
                        {formatMoney(order.total_amount)}
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
        borderRadius: RADIUS.lg,
        padding: SPACING.mdl,
        marginBottom: SPACING.smd,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.sm,
    },
    orderIdGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
        flexShrink: 1,
    },
    orderIdText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    typeBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.sm,
    },
    typeBadgeText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "700",
    },
    liveBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xsm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.xs,
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
        gap: SPACING.xsm,
        marginBottom: SPACING.smd,
    },
    customerName: {
        fontSize: FONT_SIZE.md,
        fontWeight: "500",
        color: COLORS.textPrimary,
        flex: 1,
    },
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: SPACING.sm,
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
        gap: SPACING.xs,
    },
    metaDivider: {
        width: 1,
        height: 12,
        backgroundColor: COLORS.border,
        marginHorizontal: SPACING.sm,
    },
    metaText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    totalAmount: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    headerRightGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xsm,
    },
    assignmentRow: {
        marginBottom: SPACING.sm,
    },
    assigneeBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: SPACING.xs,
        backgroundColor: COLORS.infoBg,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    assigneeText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "600",
        color: COLORS.info,
    },
    unassignedBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: SPACING.xs,
        backgroundColor: COLORS.warningBg,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    unassignedText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "600",
        color: COLORS.warning,
    },
});
