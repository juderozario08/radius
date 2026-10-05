import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { globalStyles } from '../../constants/styles';

interface CardProps extends ViewProps {
    style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style, ...props }) => {
    return (
        <View style={[globalStyles.card, style]} {...props}>
            {children}
        </View>
    );
};
