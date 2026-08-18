import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Planogram } from "@/types/inventory.types";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";

interface ProductPlanogramProps {
    planogram: Planogram | null;
}

export const ProductPlanogram: React.FC<ProductPlanogramProps> = ({ planogram }) => {
    if (!planogram) {
        return (
            <View style={globalStyles.centerElement}>
                <Text style={globalStyles.errorText}>No Planogram assigned</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.table}>
                <View style={styles.row}>
                    <Text style={styles.rowLabel}>POG ID</Text>
                    <Text style={[styles.rowValue, styles.linkText]}>{planogram.planogram_id}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.rowLabel}>POG Description</Text>
                    <Text style={styles.rowValue}>{planogram.description || planogram.name}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.rowLabel}>POG Last Updated Date</Text>
                    <View style={styles.dateContainer}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Updated</Text>
                        </View>
                        <Text style={styles.rowValue}>
                            {planogram.updated_at ? new Date(planogram.updated_at).toLocaleDateString() : new Date(planogram.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.linkButton}>
                <Ionicons name="open-outline" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.linkButtonText}>Details on Staples.ca</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    table: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        margin: 16,
        overflow: "hidden",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    rowLabel: {
        fontSize: 15,
        color: COLORS.textSecondary,
        flex: 1,
    },
    rowValue: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: "right",
    },
    linkText: {
        color: COLORS.primary,
        textDecorationLine: "underline",
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        flex: 1,
    },
    badge: {
        backgroundColor: COLORS.danger,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    badgeText: {
        color: "#FFF",
        fontSize: 12,
        fontWeight: "600",
    },
    linkButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 8,
    },
    linkButtonText: {
        color: COLORS.primary,
        fontWeight: "600",
        fontSize: 14,
    },
});
