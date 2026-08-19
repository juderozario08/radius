import React, { useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";

interface LocationInputProps {
    value: string;
    onChangeText: (text: string) => void;
}

export const LocationInput: React.FC<LocationInputProps> = ({ value, onChangeText }) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleChangeText = (text: string) => {
        const digits = text.replace(/\D/g, "").slice(0, 9);
        onChangeText(digits);
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={[styles.input, isFocused && styles.inputActive]}
                value={value}
                onChangeText={handleChangeText}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                keyboardType="numeric"
                maxLength={9} // exactly 9 digits
                placeholder="123456789"
                placeholderTextColor={COLORS.placeholder}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingHorizontal: 8,
    },
    input: {
        width: "100%",
        height: 56,
        borderWidth: 2,
        borderColor: COLORS.inputBorder,
        borderRadius: 12,
        backgroundColor: COLORS.inputBg,
        textAlign: "center",
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.textPrimary,
        letterSpacing: 3,
    },
    inputActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.surface,
    },
});
