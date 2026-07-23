import { COLORS } from "@/constants/colors";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";

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
        gap: 8,
        marginBottom: 12
    },
    rolePill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
    },
    rolePillActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary
    },
    rolePillText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textSecondary
    },
    rolePillTextActive: {
        color: "#FFFFFF"
    },
})
