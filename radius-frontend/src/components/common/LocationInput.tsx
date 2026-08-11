import React, { useRef, useState } from "react";
import { View, TextInput, StyleSheet, Text, NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native";
import { COLORS } from "@/constants/colors";

interface LocationInputProps {
    value: string;
    onChangeText: (text: string) => void;
}

const TOTAL_DIGITS = 9;
const DASH_POSITIONS = [2, 4, 6];

export const LocationInput: React.FC<LocationInputProps> = ({ value, onChangeText }) => {
    const inputRefs = useRef<(TextInput | null)[]>(Array(TOTAL_DIGITS).fill(null));
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const digits = value.padEnd(TOTAL_DIGITS, "").split("").slice(0, TOTAL_DIGITS);

    const focusBox = (index: number) => {
        if (index >= 0 && index < TOTAL_DIGITS) {
            inputRefs.current[index]?.focus();
        }
    };

    const updateValue = (newDigits: string[]) => {
        const joined = newDigits.join("").replace(/\D/g, "");
        onChangeText(joined);
    };

    const handleChangeText = (text: string, index: number) => {
        const digit = text.replace(/\D/g, "");
        if (!digit) return;

        const char = digit[digit.length - 1];
        const newDigits = [...digits];
        newDigits[index] = char;
        updateValue(newDigits);

        if (index < TOTAL_DIGITS - 1) {
            focusBox(index + 1);
        }
    };

    const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
        if (e.nativeEvent.key === "Backspace") {
            const newDigits = [...digits];
            if (digits[index] && digits[index] !== " ") {
                newDigits[index] = "";
                updateValue(newDigits);
            } else if (index > 0) {
                newDigits[index - 1] = "";
                updateValue(newDigits);
                focusBox(index - 1);
            }
        }
    };

    const renderBox = (index: number) => {
        const isActive = focusedIndex === index;
        const char = digits[index]?.trim() || "";

        return (
            <View key={index} style={[styles.box, isActive && styles.boxActive]}>
                <TextInput
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    style={styles.boxInput}
                    value={char}
                    onChangeText={(text) => handleChangeText(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    onFocus={() => setFocusedIndex(index)}
                    onBlur={() => setFocusedIndex(null)}
                    keyboardType="numeric"
                    maxLength={2}
                    selectTextOnFocus
                    caretHidden
                    autoFocus={index === 0}
                />
            </View>
        );
    };

    const boxes = [];
    for (let i = 0; i < TOTAL_DIGITS; i++) {
        if (DASH_POSITIONS.includes(i)) {
            boxes.push(<Text key={`dash-${i}`} style={styles.dash}>-</Text>);
        }
        boxes.push(renderBox(i));
    }

    return <View style={styles.container}>{boxes}</View>;
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
    },
    box: {
        width: 30,
        height: 46,
        borderWidth: 2,
        borderColor: COLORS.inputBorder,
        borderRadius: 8,
        backgroundColor: COLORS.inputBg,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 2,
    },
    boxActive: {
        borderColor: COLORS.primary,
    },
    boxInput: {
        width: "100%",
        height: "100%",
        textAlign: "center",
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.textPrimary,
        padding: 0,
    },
    dash: {
        fontSize: 20,
        color: COLORS.textSecondary,
        marginHorizontal: 2,
    },
});
