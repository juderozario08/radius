import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { COLORS } from "@/constants/colors";
import { ConnectionStatus } from "@/types/websocket.types";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

export interface ConnectionStatusBadgeProps {
    status: ConnectionStatus | string;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
    status,
    onPress,
    style,
}) => {
    const normalized = (status || "").toLowerCase();

    let bg = COLORS.neutralBg;
    let dotColor = COLORS.textSecondary;
    let textColor = COLORS.textSecondary;
    let label = "Offline";

    if (normalized === "connected") {
        bg = COLORS.activeBg;
        dotColor = COLORS.success;
        textColor = COLORS.activeText;
        label = "Live";
    } else if (normalized === "reconnecting" || normalized === "connecting") {
        bg = COLORS.pendingBg;
        dotColor = COLORS.pending;
        textColor = COLORS.warning;
        label = normalized === "reconnecting" ? "Reconnecting" : "Connecting";
    } else {
        bg = COLORS.background;
        dotColor = COLORS.textMuted;
        textColor = COLORS.textSecondary;
        label = "Offline";
    }

    const Content = (
        <View style={[styles.pill, { backgroundColor: bg }, style]}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </View>
    );

    if (onPress && normalized !== "connected") {
        return (
            <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
                {Content}
            </TouchableOpacity>
        );
    }

    return Content;
};

export default ConnectionStatusBadge;

const styles = StyleSheet.create({
    pill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 9,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.lg,
        gap: 5,
        alignSelf: "center",
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    label: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
});
