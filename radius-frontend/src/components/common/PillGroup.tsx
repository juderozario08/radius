import { COLORS } from "@/constants/colors";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

export interface PillOption<T> {
    label: string;
    value: T;
}

export default function PillGroup<T,>({ options, value, onChange }: { options: PillOption<T>[]; value: T; onChange: (value: T) => void; }) {
    return (
        <View style={styles.rolesContainer}>
            {options.map((option) => {
                const isSelected = option.value === value;
                return (
                    <TouchableOpacity
                        key={String(option.value)}
                        style={[styles.rolePill, isSelected && styles.rolePillActive]}
                        onPress={() => onChange(option.value)}
                    >
                        <Text style={[styles.rolePillText, isSelected && styles.rolePillTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    rolesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: SPACING.sm,
        marginBottom: SPACING.md
    },
    rolePill: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.xxl,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
    },
    rolePillActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary
    },
    rolePillText: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textSecondary
    },
    rolePillTextActive: {
        color: COLORS.primaryText
    },
})
