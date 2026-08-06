import React, { useRef, useState } from "react";
import { View, TextInput, StyleSheet, TouchableWithoutFeedback, Text } from "react-native";
import { COLORS } from "@/constants/colors";

interface LocationInputProps {
    value: string; // The raw 9-digit string
    onChangeText: (text: string) => void;
    onFulfill?: () => void;
}

export const LocationInput: React.FC<LocationInputProps> = ({ value, onChangeText, onFulfill }) => {
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);
    const maxLength = 9;

    const handlePress = () => {
        inputRef.current?.focus();
    };

    const handleChange = (text: string) => {
        const cleaned = text.replace(/\D/g, "").slice(0, maxLength);
        onChangeText(cleaned);
        if (cleaned.length === maxLength && onFulfill) {
            onFulfill();
        }
    };

    const renderBox = (index: number) => {
        const isCurrent = value.length === index;
        const char = value[index] || "";
        const isActive = isCurrent && isFocused;

        return (
            <View key={index} style={[styles.box, isActive && styles.boxActive]}>
                <Text style={styles.boxText}>{char}</Text>
            </View>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={handlePress}>
            <View style={styles.container}>
                {renderBox(0)}
                {renderBox(1)}
                <Text style={styles.dash}>-</Text>
                {renderBox(2)}
                {renderBox(3)}
                <Text style={styles.dash}>-</Text>
                {renderBox(4)}
                {renderBox(5)}
                <Text style={styles.dash}>-</Text>
                {renderBox(6)}
                {renderBox(7)}
                {renderBox(8)}

                <TextInput
                    ref={inputRef}
                    style={styles.hiddenInput}
                    value={value}
                    onChangeText={handleChange}
                    keyboardType="numeric"
                    maxLength={maxLength}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoFocus
                />
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    hiddenInput: {
        position: "absolute",
        width: 1,
        height: 1,
        opacity: 0,
    },
    box: {
        width: 32,
        height: 48,
        borderWidth: 2,
        borderColor: COLORS.inputBorder,
        borderRadius: 8,
        backgroundColor: COLORS.inputBg,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 4,
    },
    boxActive: {
        borderColor: COLORS.primary,
    },
    boxText: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.textPrimary,
    },
    dash: {
        fontSize: 24,
        color: COLORS.textSecondary,
        marginHorizontal: 2,
    }
});
