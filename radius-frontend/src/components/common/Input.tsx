import React from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text, ViewStyle } from 'react-native';
import { globalStyles } from '../../constants/styles';
import { COLORS } from '../../constants/colors';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({ 
    label, 
    error, 
    containerStyle, 
    style, 
    ...props 
}) => {
    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    globalStyles.textInput, 
                    error ? styles.inputError : null,
                    style
                ]}
                placeholderTextColor={COLORS.placeholder}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    inputError: {
        borderColor: COLORS.danger,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 12,
        marginTop: 4,
    },
});
