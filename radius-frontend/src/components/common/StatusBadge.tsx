//radius-frontend/src/components/common/StatusBadge.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";

export const StatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
    <View style={[styles.statusBadge, { backgroundColor: isActive ? COLORS.activeBg : COLORS.inactiveBg }]}>
        <Text style={[styles.statusText, { color: isActive ? COLORS.activeText : COLORS.inactiveText }]}>
            {isActive ? "Active" : "Inactive"}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: "600" },
});
