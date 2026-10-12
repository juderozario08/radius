import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING } from "@/constants/styles";
import { orderDetailStyles as styles } from "@/components/orders/orderDetailStyles";
import { OnlineOrderItem } from "@/types/order.types";
import { formatMoney } from "@/utils/money";

interface ScannedOrderItemCardProps {
    item: OnlineOrderItem;
    pickedQty: number;
    isSaving: boolean;
    onQtyChange: (qty: number) => void;
    onDismiss: () => void;
    onSave: () => void;
}

export function ScannedOrderItemCard({ item, pickedQty, isSaving, onQtyChange, onDismiss, onSave }: ScannedOrderItemCardProps) {
    return (
        <View style={styles.scannedCardPopup}>
            <View style={styles.scannedCardHeader}>
                <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={0.7}
                    onPress={() => { if (item.product_id) router.push(`/(app)/product/${item.product_id}`); }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xsm }}>
                        <Text style={styles.scannedCardTitle}>SKU: {item.product_sku || "N/A"}</Text>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                    </View>
                    <Text style={styles.scannedCardSub}>Price: {formatMoney(item.unit_price)} | Ordered: {item.quantity}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss scanned item">
                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>
            <View style={styles.stepperSection}>
                <Text style={styles.stepperLabel}>Picked Quantity:</Text>
                <View style={styles.stepperControls}>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => onQtyChange(Math.max(0, pickedQty - 1))} accessibilityRole="button" accessibilityLabel="Decrease picked quantity">
                        <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{pickedQty}</Text>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => onQtyChange(Math.min(item.quantity, pickedQty + 1))} accessibilityRole="button" accessibilityLabel="Increase picked quantity">
                        <Ionicons name="add" size={20} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
            <TouchableOpacity style={[globalStyles.buttonPrimary, { marginTop: SPACING.md }]} disabled={isSaving} onPress={onSave}>
                {isSaving ? <ActivityIndicator size="small" color={COLORS.surface} /> : <Text style={globalStyles.buttonTextPrimary}>Update Picked Quantity</Text>}
            </TouchableOpacity>
        </View>
    );
}
