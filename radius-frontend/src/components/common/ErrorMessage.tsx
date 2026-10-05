import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { globalStyles } from '../../constants/styles';
import { COLORS } from '../../constants/colors';

interface ErrorMessageProps {
    message?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
    if (!message) return null;
    
    return (
        <View style={styles.container}>
            <Text style={globalStyles.errorText}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
