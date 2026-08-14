import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
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
    
    // Determine the progress including the currently scanned uncommitted qty
    const totalReceived = qtyAlreadyReceived + scannedQty;
    const progressPercent = Math.min(100, Math.max(0, (totalReceived / qtyOrderedOrRequested) * 100));

    const decrementQuantity = () => onUpdateQuantity(Math.max(0, scannedQty - 1));
    const incrementQuantity = () => onUpdateQuantity(Math.min(qtyOrderedOrRequested - qtyAlreadyReceived, scannedQty + 1));

    return (
        <View style={styles.card}>
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
    card: {
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    productName: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    productMeta: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: COLORS.inactiveBg,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#388E3C',
    },
    progressText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'right',
        fontWeight: '600',
    },
    quantityRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    quantityLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    scanLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.primary,
    },
    quantityControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    quantityButton: {
        backgroundColor: COLORS.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    quantityDisplay: {
        fontSize: 18,
        fontWeight: "bold",
        width: 30,
        textAlign: "center",
        color: COLORS.textPrimary,
    },
});
