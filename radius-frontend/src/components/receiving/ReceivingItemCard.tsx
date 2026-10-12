import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";
import { PurchaseOrderItemDetail, StockTransferItemDetail } from "@/types/receiving.types";

interface ReceivingItemCardProps {
    item: PurchaseOrderItemDetail | StockTransferItemDetail;
    scannedQty: number;
    onUpdateQuantity: (newQty: number) => void;
}

export function ReceivingItemCard({ item, scannedQty, onUpdateQuantity }: ReceivingItemCardProps) {
    const isPO = 'qty_ordered' in item;

    const qtyOrderedOrRequested = isPO ? (item as PurchaseOrderItemDetail).qty_ordered : (item as StockTransferItemDetail).qty_requested;
    const qtyAlreadyReceived = isPO ? (item as PurchaseOrderItemDetail).qty_received : ((item as StockTransferItemDetail).qty_received || 0);

    const totalReceived = qtyAlreadyReceived + scannedQty;
    const progressPercent = Math.min(100, Math.max(0, (totalReceived / qtyOrderedOrRequested) * 100));

    const decrementQuantity = () => onUpdateQuantity(Math.max(0, scannedQty - 1));
    const incrementQuantity = () => onUpdateQuantity(Math.min(qtyOrderedOrRequested - qtyAlreadyReceived, scannedQty + 1));

    return (
        <View style={[globalStyles.card, { marginBottom: SPACING.md, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, shadowOpacity: 0.05, elevation: 1 }]}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productMeta}>SKU: {item.sku} | UPC: {item.upc}</Text>

            <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={styles.progressText}>{totalReceived} / {qtyOrderedOrRequested}</Text>
            </View>

            <View style={styles.quantityRow}>
                <View>
                    <Text style={styles.quantityLabel}>Already Received: {qtyAlreadyReceived}</Text>
                    <Text style={styles.scanLabel}>New Scan Qty:</Text>
                </View>

                <View style={styles.quantityControls}>
                    <TouchableOpacity style={styles.quantityButton} onPress={decrementQuantity}>
                        <Ionicons name="remove" size={20} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.quantityDisplay}>{scannedQty}</Text>
                    <TouchableOpacity style={styles.quantityButton} onPress={incrementQuantity}>
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    productName: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    productMeta: {
        fontSize: FONT_SIZE.smd,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    progressContainer: {
        marginBottom: SPACING.lg,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: COLORS.inactiveBg,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: SPACING.xs,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.successAccent,
    },
    progressText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        textAlign: 'right',
        fontWeight: '600',
    },
    quantityRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    quantityLabel: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xxs,
    },
    scanLabel: {
        fontSize: FONT_SIZE.md,
        fontWeight: "600",
        color: COLORS.primary,
    },
    quantityControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.lg,
    },
    quantityButton: {
        backgroundColor: COLORS.primary,
        width: 32,
        height: 32,
        borderRadius: RADIUS.xl,
        justifyContent: "center",
        alignItems: "center",
    },
    quantityDisplay: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "bold",
        width: 30,
        textAlign: "center",
        color: COLORS.textPrimary,
    },
});
