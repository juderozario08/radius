import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { globalStyles, SPACING } from '../../constants/styles';
import { Button } from './Button';

interface ErrorMessageProps {
    message?: string;
    onRetry?: () => void;
    retryLabel?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry, retryLabel = 'Try again' }) => {
    if (!message) return null;
    
    return (
        <View style={styles.container}>
            <Text style={globalStyles.errorText}>{message}</Text>
            {onRetry && <Button title={retryLabel} onPress={onRetry} style={styles.retryButton} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    retryButton: {
        marginTop: SPACING.lg,
        alignSelf: 'stretch',
    },
});
