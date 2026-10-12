import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text, ViewStyle } from 'react-native';
import { globalStyles, SPACING, FONT_SIZE } from '../../constants/styles';
import { COLORS } from '../../constants/colors';

export interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(({ 
    label, 
    error, 
    containerStyle, 
    style, 
    ...props 
}, ref) => {
    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                ref={ref}
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
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    inputError: {
        borderColor: COLORS.danger,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: FONT_SIZE.sm,
        marginTop: SPACING.xs,
    },
});
