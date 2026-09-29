import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { globalStyles } from '../../constants/styles';

interface EmptyStateProps {
    message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message = 'No data available.' }) => {
    return (
        <View style={styles.container}>
            <Text style={globalStyles.emptyText}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
