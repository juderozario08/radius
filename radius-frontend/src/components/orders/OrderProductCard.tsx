import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { COLORS } from "@/constants/colors";
import { SPACING } from "@/constants/styles";
import { orderDetailStyles as styles } from "@/components/orders/orderDetailStyles";
import { OnlineOrderItem } from "@/types/order.types";
import { formatMoney } from "@/utils/money";

interface OrderProductCardProps {
    item: OnlineOrderItem;
    onAction: (item: OnlineOrderItem) => void;
}

export function OrderProductCard({ item, onAction }: OrderProductCardProps) {
    const isItemCancelled = item.status === "CANCELLED";
    const isItemRemoved = item.status === "REMOVED";
    const isItemComplete = !isItemCancelled && !isItemRemoved && item.picked_qty >= item.quantity;
    const openProduct = () => {
        if (item.product_id) router.push(`/(app)/product/${item.product_id}`);
    };

    return (
        <View style={[
            styles.productCard,
            (isItemCancelled || isItemRemoved) && styles.productCardDimmed,
            isItemComplete && styles.productCardComplete,
        ]}>
            <View style={styles.productCardHeader}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.7} onPress={openProduct}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
                        <Text style={styles.productSku}>SKU: {item.product_sku || "N/A"}</Text>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
                        {item.status && item.status !== "ACTIVE" && (
                            <View style={[styles.itemStatusBadge, { backgroundColor: isItemCancelled ? COLORS.inactiveBg : COLORS.warningBg }]}>
                                <Text style={[styles.itemStatusText, { color: isItemCancelled ? COLORS.primary : COLORS.warning }]}>
                                    {item.status}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.productPrice}>{formatMoney(item.unit_price)} each</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.itemActionBtn}
                    onPress={() => onAction(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Actions for ${item.product_sku || `item ${item.product_id}`}`}
                >
                    <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={openProduct}>
                <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Picked: {item.picked_qty} / {item.quantity}</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[
                            styles.progressBarFill,
                            {
                                width: `${Math.min(100, (item.picked_qty / Math.max(1, item.quantity)) * 100)}%`,
                                backgroundColor: item.picked_qty >= item.quantity ? COLORS.success : COLORS.primary,
                            },
                        ]} />
                    </View>
                </View>
                {item.reason && (
                    <View style={styles.itemReasonRow}>
                        <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.itemReasonText}>Note: {item.reason}</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
}
