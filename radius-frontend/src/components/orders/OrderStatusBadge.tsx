import React from "react";
import { StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { COLORS } from "@/constants/colors";
import { Badge } from "@/components/common/Badge";

export interface OrderStatusBadgeProps {
    status: string;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

export const getOrderStatusColor = (status: string): { bg: string; text: string } => {
    const normalized = (status || "").toUpperCase().trim();
    switch (normalized) {
        case "READY FOR PICKUP":
        case "READY_FOR_PICKUP":
        case "READY":
        case "AWAITING PICKUP":
        case "AWAITING_PICKUP":
            return { bg: "#FFF3E0", text: "#E65100" };

        case "WORK IN PROGRESS":
        case "WORK_IN_PROGRESS":
        case "PROCESSING":
        case "PICKING":
        case "PACKED":
            return { bg: "#E3F2FD", text: "#1565C0" };

        case "SHIPPED":
        case "OUT FOR DELIVERY":
        case "OUT_FOR_DELIVERY":
            return { bg: "#F3E5F5", text: "#6A1B9A" };

        case "DELIVERING":
            return { bg: "#E0F7FA", text: "#006064" };

        case "RELEASED":
        case "DELIVERED":
        case "COMPLETED":
            return { bg: COLORS.activeBg, text: COLORS.activeText };

        case "PENDING":
        case "PLACED":
            return { bg: "#FFF8E1", text: "#F57F17" };

        case "CANCELLED":
            return { bg: COLORS.inactiveBg, text: COLORS.inactiveText };

        default:
            return { bg: COLORS.neutralBg, text: COLORS.textSecondary };
    }
};

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, style, textStyle }) => {
    const { bg, text } = getOrderStatusColor(status);

    return (
        <Badge
            label={status || "UNKNOWN"}
            backgroundColor={bg}
            color={text}
            style={[styles.badge, style]}
            textStyle={[styles.text, textStyle]}
        />
    );
};

export default OrderStatusBadge;

const styles = StyleSheet.create({
    badge: {
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
