import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TouchableWithoutFeedback
} from "react-native";
import { COLORS } from "@/constants/colors";
import { SPACING, RADIUS, FONT_SIZE } from "@/constants/styles";

export interface DropdownOption<T> {
    label: string;
    value: T;
}

export interface DropdownProps<T> {
    options: DropdownOption<T>[];
    value?: T;
    onSelect: (value: T) => void;
    title?: string;
    placeholder?: string;
    disabled?: boolean;
    style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
}

export default function Dropdown<T>({
    options,
    value,
    onSelect,
    title = "Select an option",
    placeholder = "Select...",
    disabled = false,
    style,
}: DropdownProps<T>) {
    const [isOpen, setIsOpen] = useState(false);

    const selectedOption = options.find((opt) => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    return (
        <View>
            <TouchableOpacity
                style={[styles.dropdownTrigger, style, disabled && styles.dropdownDisabled]}
                disabled={disabled}
                onPress={() => setIsOpen(true)}
                accessibilityRole="combobox"
                accessibilityLabel={title || placeholder || "Dropdown"}
                accessibilityState={{ expanded: isOpen, disabled }}
            >
                <Text style={styles.dropdownTriggerText}>{displayLabel}</Text>
                <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>

            <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
                <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
                    <View style={styles.dropdownOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.dropdownMenu}>
                                {title && <Text style={styles.dropdownMenuTitle}>{title}</Text>}

                                {options.map((option, index) => {
                                    const isActive = value === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={`dropdown-opt-${index}`}
                                            style={[
                                                styles.dropdownItem,
                                                isActive && styles.dropdownItemActive
                                            ]}
                                            onPress={() => {
                                                onSelect(option.value);
                                                setIsOpen(false);
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel={option.label}
                                            accessibilityState={{ selected: isActive }}
                                        >
                                            <Text style={[
                                                styles.dropdownItemText,
                                                isActive && styles.dropdownItemTextActive
                                            ]}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    dropdownTrigger: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.smd,
        minWidth: 70,
    },
    dropdownDisabled: {
        opacity: 0.5,
    },
    dropdownTriggerText: {
        fontSize: FONT_SIZE.md,
        fontWeight: "500",
        color: COLORS.textPrimary,
    },
    dropdownIcon: {
        fontSize: FONT_SIZE.xxs,
        color: COLORS.textSecondary,
        marginLeft: SPACING.sm,
    },
    dropdownOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlayLight,
        justifyContent: "center",
        alignItems: "center",
    },
    dropdownMenu: {
        width: 200,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.sm,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    dropdownMenuTitle: {
        fontSize: FONT_SIZE.smd,
        fontWeight: "600",
        color: COLORS.textSecondary,
        textAlign: "center",
        marginBottom: SPACING.sm,
        marginTop: SPACING.xs,
    },
    dropdownItem: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.xs,
    },
    dropdownItemActive: {
        backgroundColor: COLORS.primary,
    },
    dropdownItemText: {
        fontSize: FONT_SIZE.mdl,
        fontWeight: "500",
        color: COLORS.textPrimary,
        textAlign: "center",
    },
    dropdownItemTextActive: {
        color: COLORS.primaryText,
        fontWeight: "600",
    },
});
