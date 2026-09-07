// radius-frontend/src/components/orders/OrderStatusBadge.tsx
import React from "react";
import { StyleSheet, Text, View, StyleProp, ViewStyle, TextStyle } from "react-native";
import { COLORS } from "@/constants/colors";

export interface OrderStatusBadgeProps {
    status: string;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

/**
 * Maps order status strings to consistent background and text colors.
 * Strictly adheres to DRY principles using tokens from COLORS.
 */
export const getOrderStatusColor = (status: string): { bg: string; text: string } => {
    const normalized = (status || "").toUpperCase().trim();
    switch (normalized) {
        case "READY FOR PICKUP":
        case "READY_FOR_PICKUP":
        case "READY":
        case "AWAITING PICKUP":
        case "AWAITING_PICKUP":
            return { bg: "#FFF3E0", text: "#E65100" }; // Amber/Orange

        case "WORK IN PROGRESS":
        case "WORK_IN_PROGRESS":
        case "PROCESSING":
        case "PICKING":
        case "PACKED":
            return { bg: "#E3F2FD", text: "#1565C0" }; // Blue

        case "SHIPPED":
        case "OUT FOR DELIVERY":
        case "OUT_FOR_DELIVERY":
            return { bg: "#F3E5F5", text: "#6A1B9A" }; // Purple

        case "DELIVERING":
            return { bg: "#E0F7FA", text: "#006064" }; // Cyan

        case "RELEASED":
        case "DELIVERED":
        case "COMPLETED":
            return { bg: COLORS.activeBg, text: COLORS.activeText }; // Success Green

        case "PENDING":
        case "PLACED":
            return { bg: "#FFF8E1", text: "#F57F17" }; // Warm Yellow

        case "CANCELLED":
            return { bg: COLORS.inactiveBg, text: COLORS.inactiveText }; // Danger Red

        default:
            return { bg: COLORS.neutralBg, text: COLORS.textSecondary }; // Neutral Gray
    }
};

/**
 * Reusable pill badge component for displaying order status across the application.
 */
export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, style, textStyle }) => {
    const { bg, text } = getOrderStatusColor(status);

    return (
        <View style={[styles.badge, { backgroundColor: bg }, style]}>
            <Text style={[styles.text, { color: text }, textStyle]}>
                {status || "UNKNOWN"}
            </Text>
        </View>
    );
};

export default OrderStatusBadge;

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: "flex-start",
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        fontSize: 10,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
});
