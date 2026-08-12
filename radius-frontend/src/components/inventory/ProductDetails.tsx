import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Product } from "@/types/inventory.types";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { DetailRow } from "@/components/common/DetailRow";
import { StatusBadge } from "@/components/common/StatusBadge";

interface ProductDetailsProps {
    product: Product;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.headerCard}>
                <View style={globalStyles.cardHeader}>
                    <Text style={styles.name}>{product.name}</Text>
                    <StatusBadge isActive={product.is_active} />
                </View>
                <Text style={styles.sku}>SKU: {product.sku}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <DetailRow label="Product ID:" value={product.product_id} />
                <DetailRow label="UPC:" value={product.upc} />
                <DetailRow label="Brand:" value={product.brand} />
                <DetailRow label="Category ID:" value={product.category_id} />
            </View>

            {product.description && (
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.description}>{product.description}</Text>
                </View>
            )}

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Metrics</Text>
                <DetailRow label="Unit of Measure:" value={product.unit_of_measure} />
                <DetailRow label="Units Per Case:" value={product.units_per_case} />
                <DetailRow label="Weight (kg):" value={product.weight.toFixed(2)} />
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 16,
    },
    headerCard: {
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
    name: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: 12,
    },
    sku: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSecondary,
        marginTop: 8,
    },
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
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        color: COLORS.textPrimary,
        fontWeight: "400",
    },
});
