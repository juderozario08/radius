//radius-frontend/src/components/common/DetailRow.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";

export const DetailRow: React.FC<{ label: string; value: string | number; layout?: "inline" | "row" }> = ({
    label,
    value,
    layout = "row",
}) => {
    if (layout === "inline") {
        return (
            <Text style={styles.detailRow}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
            </Text>
        );
    }
    return (
        <View style={globalStyles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    detailRow: { fontSize: 14 },
    label: { color: COLORS.textSecondary, fontWeight: "500" },
    value: { color: COLORS.textPrimary, fontWeight: "400" },
});
