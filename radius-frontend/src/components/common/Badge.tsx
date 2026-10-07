import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";

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
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    text: {
        fontSize: 12,
        fontWeight: "600",
    },
});
