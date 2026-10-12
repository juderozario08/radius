import React from "react";
import { StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { COLORS } from "@/constants/colors";
import { Badge } from "@/components/common/Badge";
import { FONT_SIZE } from "@/constants/styles";

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
            return { bg: COLORS.warningBg, text: COLORS.warning };

        case "WORK IN PROGRESS":
        case "WORK_IN_PROGRESS":
        case "PROCESSING":
        case "PICKING":
        case "PACKED":
            return { bg: COLORS.infoBg, text: COLORS.info };

        case "SHIPPED":
        case "OUT FOR DELIVERY":
        case "OUT_FOR_DELIVERY":
            return { bg: COLORS.purpleBg, text: COLORS.purple };

        case "DELIVERING":
            return { bg: COLORS.cyanBg, text: COLORS.cyan };

        case "RELEASED":
        case "DELIVERED":
        case "COMPLETED":
            return { bg: COLORS.activeBg, text: COLORS.activeText };

        case "PENDING":
        case "PLACED":
            return { bg: COLORS.pendingBg, text: COLORS.pending };

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
        fontSize: FONT_SIZE.xxs,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
});
