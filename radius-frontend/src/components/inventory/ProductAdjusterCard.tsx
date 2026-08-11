import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { MimsProductInventory } from "@/types/inventory.types";

interface ProductAdjusterCardProps {
    product: MimsProductInventory;
    onUpdateQuantity: (productId: number, newQuantity: number) => void;
}

export function ProductAdjusterCard({ product, onUpdateQuantity }: ProductAdjusterCardProps) {
    const decrementQuantity = () => onUpdateQuantity(product.product_id, Math.max(0, product.on_hand_qty - 1));
    const incrementQuantity = () => onUpdateQuantity(product.product_id, product.on_hand_qty + 1);

    return (
        <View style={styles.card}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productMeta}>SKU: {product.sku} | UPC: {product.upc}</Text>

            <View style={styles.quantityRow}>
                <Text style={styles.quantityLabel}>Store Qty: {product.on_hand_qty}</Text>
                <View style={styles.quantityControls}>
                    <TouchableOpacity style={styles.quantityButton} onPress={decrementQuantity}>
                        <Ionicons name="remove" size={20} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.quantityDisplay}>{product.on_hand_qty}</Text>
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
        backgroundColor: COLORS.background,
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
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
        marginBottom: 8,
    },
    quantityRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },
    quantityLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textPrimary,
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
        fontSize: 16,
        fontWeight: "bold",
        width: 30,
        textAlign: "center",
    },
});
