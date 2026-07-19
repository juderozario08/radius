//radius-frontend/src/components/common/ActionButtonRow.tsx
import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";

type ButtonKind = "neutral" | "primary" | "accent" | "danger";

const BUTTON_KIND_STYLES: Record<ButtonKind, { container: object; text: { color: string } }> = {
    neutral: { container: { backgroundColor: COLORS.neutralBg }, text: { color: COLORS.textPrimary } },
    primary: { container: { backgroundColor: COLORS.primary }, text: { color: COLORS.primaryText } },
    accent: { container: { backgroundColor: COLORS.accent }, text: { color: COLORS.accentText } },
    danger: { container: { backgroundColor: COLORS.danger }, text: { color: COLORS.dangerText } },
};

export interface ActionButtonConfig {
    key: string;
    label: string;
    kind: ButtonKind;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
}

export const ActionButtonRow: React.FC<{ buttons: ActionButtonConfig[] }> = ({ buttons }) => (
    <View style={styles.actionRow}>
        {buttons.map((button) => {
            const kindStyle = BUTTON_KIND_STYLES[button.kind];
            return (
                <TouchableOpacity
                    key={button.key}
                    style={[styles.actionButton, kindStyle.container]}
                    onPress={button.onPress}
                    disabled={button.disabled || button.loading}
                >
                    {button.loading ? (
                        <ActivityIndicator color={kindStyle.text.color as string} />
                    ) : (
                        <Text style={[styles.actionButtonText, kindStyle.text]}>{button.label}</Text>
                    )}
                </TouchableOpacity>
            );
        })}
    </View>
);

const styles = StyleSheet.create({
    actionRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    actionButton: {
        flex: 0,
        minWidth: 92,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    actionButtonText: { fontWeight: "600", fontSize: 14 },
});
