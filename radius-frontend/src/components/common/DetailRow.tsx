import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { SPACING, FONT_SIZE } from "@/constants/styles";

export const DetailRow: React.FC<{ label: string; value: string | number; layout?: "inline" | "row" | "stacked" }> = ({
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
    if (layout === "stacked") {
        return (
            <View style={styles.stackedContainer}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.stackedValue}>{value}</Text>
            </View>
        );
    }
    return (
        <View style={styles.rowContainer}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    detailRow: { fontSize: FONT_SIZE.md },
    label: { color: COLORS.textSecondary, fontWeight: "500" },
    value: { color: COLORS.textPrimary, fontWeight: "400" },
    rowContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingVertical: SPACING.xxs,
    },
    rowValue: {
        color: COLORS.textPrimary,
        fontWeight: "400",
        flex: 1,
        textAlign: "right",
        marginLeft: SPACING.md,
    },
    stackedContainer: {
        paddingVertical: SPACING.xs,
    },
    stackedValue: {
        color: COLORS.textPrimary,
        fontWeight: "400",
        marginTop: SPACING.xs,
        lineHeight: 20,
    },
});
