import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { PurchaseOrderItemDetail, StockTransferItemDetail } from "@/types/receiving.types";
import { SPACING, FONT_SIZE } from "@/constants/styles";

interface POItemRowProps {
    item: PurchaseOrderItemDetail | StockTransferItemDetail;
    pendingScanQty?: number;
}

export function POItemRow({ item, pendingScanQty = 0 }: POItemRowProps) {
    const isPO = 'qty_ordered' in item;
    
    const qtyOrdered = isPO ? (item as PurchaseOrderItemDetail).qty_ordered : (item as StockTransferItemDetail).qty_requested;
    const qtyReceived = isPO ? (item as PurchaseOrderItemDetail).qty_received : ((item as StockTransferItemDetail).qty_received || 0);
    
    const totalQty = qtyReceived + pendingScanQty;
    const progressPercent = Math.min(100, Math.max(0, (totalQty / qtyOrdered) * 100));
    
    const isFullyReceived = totalQty >= qtyOrdered;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.qtyText, isFullyReceived && styles.fullyReceivedText]}>
                    {totalQty} / {qtyOrdered}
                </Text>
            </View>
            <View style={styles.metaRow}>
                <Text style={styles.sku}>SKU: {item.sku}</Text>
                {pendingScanQty > 0 && (
                    <Text style={styles.pendingText}>+{pendingScanQty} pending</Text>
                )}
            </View>
            <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: isFullyReceived ? COLORS.successAccent : COLORS.primary }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.xs,
    },
    name: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "600",
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: SPACING.sm,
    },
    qtyText: {
        fontSize: FONT_SIZE.md,
        fontWeight: "700",
        color: COLORS.textSecondary,
    },
    fullyReceivedText: {
        color: COLORS.successAccent,
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.sm,
    },
    sku: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
    },
    pendingText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.warningAccent,
        fontWeight: '600',
    },
    progressBg: {
        height: 4,
        backgroundColor: COLORS.inactiveBg,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    }
});
