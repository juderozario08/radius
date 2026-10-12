import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PurchaseOrderLPR } from "@/types/receiving.types";
import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

export function LPRCard({ lpr }: { lpr: PurchaseOrderLPR }) {
    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <Ionicons name="barcode-outline" size={24} color={COLORS.textSecondary} />
                <Text style={styles.barcode}>{lpr.lpr_barcode}</Text>
            </View>
            <View style={styles.statusContainer}>
                <Ionicons 
                    name={lpr.is_received ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={lpr.is_received ? COLORS.successAccent : COLORS.textSecondary} 
                />
                <Text style={[styles.statusText, { color: lpr.is_received ? COLORS.successAccent : COLORS.textSecondary }]}>
                    {lpr.is_received ? "Received" : "Pending"}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.sm,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
    },
    barcode: {
        fontSize: FONT_SIZE.lg,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
    },
    statusText: {
        fontSize: FONT_SIZE.md,
        fontWeight: "500",
    }
});
