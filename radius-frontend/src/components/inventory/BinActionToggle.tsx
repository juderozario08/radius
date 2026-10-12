import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS } from "@/constants/colors";
import { SPACING, RADIUS } from "@/constants/styles";

type BinAction = "IN" | "OUT";

interface BinActionToggleProps {
    action: BinAction;
    onActionChange: (action: BinAction) => void;
}

export function BinActionToggle({ action, onActionChange }: BinActionToggleProps) {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.button, action === "IN" && styles.buttonActiveIn]}
                onPress={() => onActionChange("IN")}
            >
                <Text style={[styles.buttonText, action === "IN" && styles.buttonTextActive]}>BIN IN</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, action === "OUT" && styles.buttonActiveOut]}
                onPress={() => onActionChange("OUT")}
            >
                <Text style={[styles.buttonText, action === "OUT" && styles.buttonTextActive]}>BIN OUT</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        margin: SPACING.lg,
        backgroundColor: COLORS.inputBg,
        borderRadius: RADIUS.md,
        padding: SPACING.xs,
    },
    button: {
        flex: 1,
        paddingVertical: SPACING.smd,
        alignItems: "center",
        borderRadius: RADIUS.sm,
    },
    buttonActiveIn: {
        backgroundColor: COLORS.activeText,
    },
    buttonActiveOut: {
        backgroundColor: COLORS.danger,
    },
    buttonText: {
        fontWeight: "bold",
        color: COLORS.textSecondary,
    },
    buttonTextActive: {
        color: "white",
    },
});
