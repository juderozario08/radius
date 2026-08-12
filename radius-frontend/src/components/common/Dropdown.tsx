// radius-frontend/src/components/common/Dropdown.tsx
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

    // Find the label for the currently selected value
    const selectedOption = options.find((opt) => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    return (
        <View>
            <TouchableOpacity
                style={[styles.dropdownTrigger, style, disabled && styles.dropdownDisabled]}
                disabled={disabled}
                onPress={() => setIsOpen(true)}
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
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minWidth: 70,
    },
    dropdownDisabled: {
        opacity: 0.5,
    },
    dropdownTriggerText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textPrimary,
    },
    dropdownIcon: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginLeft: 8,
    },
    dropdownOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    dropdownMenu: {
        width: 200,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    dropdownMenuTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textSecondary,
        textAlign: "center",
        marginBottom: 8,
        marginTop: 4,
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 4,
    },
    dropdownItemActive: {
        backgroundColor: COLORS.primary,
    },
    dropdownItemText: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.textPrimary,
        textAlign: "center",
    },
    dropdownItemTextActive: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
});
