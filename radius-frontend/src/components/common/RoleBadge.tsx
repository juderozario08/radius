import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { EmployeeRole } from "@/types/auth.types";
import { capitalize } from "@/utils/helpers";

const ROLE_COLORS: Record<EmployeeRole, { bg: string, text: string }> = {
    SALES: { bg: "#E3F2FD", text: "#1976D2" }, // Light Blue
    SERVICE: { bg: "#F3E5F5", text: "#7B1FA2" }, // Light Purple
    MANAGER: { bg: "#E8F5E9", text: "#388E3C" }, // Light Green
    ADMIN: { bg: "#FFF3E0", text: "#F57C00" }, // Light Orange
};

export const RoleBadge: React.FC<{ role: EmployeeRole }> = ({ role }) => {
    const colors = ROLE_COLORS[role] || { bg: COLORS.inactiveBg, text: COLORS.inactiveText };

    return (
        <View style={[styles.roleBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.roleText, { color: colors.text }]}>
                {capitalize(role)}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roleText: {
        fontSize: 12,
        fontWeight: "600",
    },
});
