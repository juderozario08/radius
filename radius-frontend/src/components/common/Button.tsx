import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../../constants/colors';
import { globalStyles } from '../../constants/styles';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'danger';
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({ 
    title, 
    variant = 'primary', 
    style, 
    textStyle, 
    ...props 
}) => {
    let buttonStyle: ViewStyle;
    let textVariantStyle: TextStyle;

    switch (variant) {
        case 'secondary':
            buttonStyle = globalStyles.buttonSecondary;
            textVariantStyle = globalStyles.buttonTextSecondary;
            break;
        case 'danger':
            buttonStyle = { ...globalStyles.buttonPrimary, backgroundColor: COLORS.danger };
            textVariantStyle = { ...globalStyles.buttonTextPrimary, color: COLORS.dangerText };
            break;
        case 'primary':
        default:
            buttonStyle = globalStyles.buttonPrimary;
            textVariantStyle = globalStyles.buttonTextPrimary;
            break;
    }

    return (
        <TouchableOpacity 
            style={[buttonStyle, props.disabled && styles.disabled, style]} 
            activeOpacity={0.8}
            {...props}
        >
            <Text style={[textVariantStyle, textStyle]}>{title}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    disabled: {
        opacity: 0.5,
    },
});
