import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

export interface BadgeProps {
    label: string;
    backgroundColor: string;
    color: string;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

export const Badge: React.FC<BadgeProps> = ({ label, backgroundColor, color, style, textStyle }) => (
    <View style={[styles.badge, { backgroundColor }, style]}>
        <Text style={[styles.text, { color }, textStyle]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: SPACING.smd,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.lg,
    },
    text: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "600",
    },
});
