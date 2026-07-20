//radius-frontend/src/components/common/TerminatedBadge.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const TerminatedBadge: React.FC<{ isTerminated: boolean }> = ({ isTerminated }) => {
    if (!isTerminated) return null;

    return (
        <View style={styles.terminatedBadge}>
            <Text style={styles.terminatedText}>Terminated</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    terminatedBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: "#FFEBEB",
    },
    terminatedText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#CC0000",
    },
});
